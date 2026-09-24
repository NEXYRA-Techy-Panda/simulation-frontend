"use client";

// SIM-VIS-01 selected-room panel (Agent M-D — FreeBuff).
//
// Presents the actual readings and the existing supported controls for the
// selected room. No new control is introduced: only lighting devices that the
// inventory marks as switch-controllable expose on/off/clear.

import {
  policyForDevice,
  type Device,
  type Inventory,
  type Room,
} from "../lib/inventory";
import { graceSeconds } from "../lib/office-map";
import {
  GLYPH_LABEL,
  decorativeUnitCount,
  glyphKindFor,
  groupSummary,
  stateLabel,
  visualStateFor,
} from "../lib/equipment";
import type { DeviceState } from "../lib/sim-state";
import type { LiveData } from "./office-floor-plan";

export default function RoomInspector({
  inventory,
  room,
  live,
  buildingHours,
  mutateDisabled,
  devicePendingId,
  onDeviceCommand,
}: {
  inventory: Inventory;
  room: Room | null;
  live: LiveData | null;
  buildingHours: string | null;
  mutateDisabled: boolean;
  devicePendingId: string | null;
  onDeviceCommand:
    | ((deviceId: string, control: "on" | "off" | "clear") => void)
    | null;
}) {
  if (!room) {
    return (
      <section className="sim-panel" aria-label="Selected room">
        <h2 className="sim-panel-title">Selected room</h2>
        <p className="sim-muted">
          Select a room on the map or in the room list to see its readings and
          controls.
        </p>
      </section>
    );
  }

  const devices = inventory.devices.filter((d) => d.room_id === room.room_id);
  const roomLive = live?.rooms.get(room.room_id) ?? null;
  const occupancyKnown = roomLive !== null;

  return (
    <section className="sim-panel" aria-label={`Selected room: ${room.name}`}>
      <div className="sim-panel-head">
        <h2 className="sim-panel-title">{room.name}</h2>
        <span className="sim-pill">{devices.length} devices</span>
      </div>

      <dl className="sim-readings">
        <div>
          <dt>Occupancy</dt>
          <dd>
            {occupancyKnown ? (
              <>
                {roomLive.occupancy}{" "}
                <span className="sim-muted">(reported)</span>
              </>
            ) : (
              <span className="sim-unknown">unavailable</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Room power</dt>
          <dd>
            {roomLive ? (
              `${roomLive.power_w} W`
            ) : (
              <span className="sim-unknown">unavailable</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Room energy</dt>
          <dd>
            {roomLive ? (
              `${roomLive.energy_kwh} kWh`
            ) : (
              <span className="sim-unknown">unavailable</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Capacity</dt>
          <dd>
            {room.capacity} people{" "}
            <span className="sim-muted">(capacity, not occupancy)</span>
          </dd>
        </div>
        {buildingHours && (
          <div>
            <dt>Building hours</dt>
            <dd className="sim-small">{buildingHours}</dd>
          </div>
        )}
      </dl>

      <h3 className="sim-subtitle">Equipment</h3>
      {devices.length === 0 ? (
        <p className="sim-muted">No devices listed for this room.</p>
      ) : (
        <ul className="sim-device-list">
          {devices.map((device) => (
            <DeviceRow
              key={device.device_id}
              device={device}
              runtime={live?.devices.get(device.device_id) ?? null}
              hasLiveData={live !== null}
              inventory={inventory}
              mutateDisabled={mutateDisabled}
              pending={devicePendingId === device.device_id}
              onDeviceCommand={onDeviceCommand}
            />
          ))}
        </ul>
      )}

      {!live && (
        <p className="sim-muted sim-small">
          Runtime data has not arrived, so equipment state and occupancy show
          “unavailable” — that is not a claim that anything is off or empty.
        </p>
      )}
    </section>
  );
}

function DeviceRow({
  device,
  runtime,
  hasLiveData,
  inventory,
  mutateDisabled,
  pending,
  onDeviceCommand,
}: {
  device: Device;
  runtime: DeviceState | null;
  hasLiveData: boolean;
  inventory: Inventory;
  mutateDisabled: boolean;
  pending: boolean;
  onDeviceCommand:
    | ((deviceId: string, control: "on" | "off" | "clear") => void)
    | null;
}) {
  const state = visualStateFor(runtime, device.always_on);
  const policy = policyForDevice(inventory, device.device_id);
  const grace = policy ? graceSeconds(policy.rules) : null;
  const glyph = glyphKindFor(device.device_type);
  const controllable =
    device.device_type === "lighting" &&
    (device.controls ?? []).includes("switch");
  const units = decorativeUnitCount(device.quantity);

  return (
    <li className="sim-device">
      <div className="sim-device-head">
        <span className={`sim-state-dot sim-state-${stateLabel(state).replace(/[^a-z]/g, "")}`} aria-hidden="true" />
        <p className="sim-device-name">
          {device.name}{" "}
          <span className="sim-muted">
            · {GLYPH_LABEL[glyph]}
            {device.quantity > 1 ? ` ×${units} drawn` : ""}
          </span>
        </p>
        <span className="sim-state-word">{stateLabel(state)}</span>
      </div>

      <p className="sim-mono sim-small">{groupSummary(device)}</p>
      <p className="sim-muted sim-small">
        Nominal group rating — not measured power and not multiplied by
        quantity.
      </p>

      {runtime ? (
        <p className="sim-mono sim-small">
          Live: {runtime.power_w} W · {runtime.energy_kwh} kWh cumulative ·{" "}
          {runtime.on ? "on" : "off"}
          {runtime.override
            ? ` · manual override ${runtime.override.on ? "on" : "off"}`
            : ""}
        </p>
      ) : (
        <p className="sim-mono sim-small sim-unknown">
          Live readings: {hasLiveData ? "not reported for this device" : "not available yet"}
        </p>
      )}

      {device.always_on && (
        <p className="sim-badge-always">Always-on exception (policy)</p>
      )}
      {policy && (
        <p className="sim-mono sim-small sim-muted">
          Schedule: {policy.kind} v{policy.version}
          {grace !== null ? ` · vacancy grace ${grace} s` : ""}
        </p>
      )}

      {controllable && onDeviceCommand && (
        <div className="sim-controls">
          <button
            type="button"
            disabled={mutateDisabled || pending}
            onClick={() => onDeviceCommand(device.device_id, "on")}
            className="sim-btn sim-btn-ghost"
          >
            {pending ? "…" : "On"}
          </button>
          <button
            type="button"
            disabled={mutateDisabled || pending}
            onClick={() => onDeviceCommand(device.device_id, "off")}
            className="sim-btn sim-btn-ghost"
          >
            {pending ? "…" : "Off"}
          </button>
          <button
            type="button"
            disabled={mutateDisabled || pending}
            onClick={() => onDeviceCommand(device.device_id, "clear")}
            title="Return to backend policy/base control"
            className="sim-btn sim-btn-ghost"
          >
            {pending ? "…" : "Clear"}
          </button>
        </div>
      )}
    </li>
  );
}
