"use client";

import type { Inventory } from "../lib/inventory";
import type { DeviceState, RoomState } from "../lib/sim-state";
import { isSwitchControllable } from "../lib/equipment";

interface WorkbenchLiveData {
  devices: Map<string, DeviceState>;
  rooms: Map<string, RoomState>;
}

function formatPower(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value} W` : "Unavailable";
}

function formatEnergy(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value} kWh` : "Unavailable";
}

function formatOccupancy(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value} reported` : "Unavailable";
}

function heatColor(value: number | null, max: number): string {
  if (value === null || max <= 0) return "#17233a";
  const ratio = Math.max(0, Math.min(1, value / max));
  const hue = Math.round(220 - ratio * 190);
  const lightness = Math.round(18 + ratio * 18);
  return `hsl(${hue} 68% ${lightness}%)`;
}

function roomState(
  live: WorkbenchLiveData | null,
  roomId: string,
): RoomState | null {
  return live?.rooms.get(roomId) ?? null;
}

function deviceState(
  live: WorkbenchLiveData | null,
  deviceId: string,
): DeviceState | null {
  return live?.devices.get(deviceId) ?? null;
}

function stateLabel(runtime: DeviceState | null): string {
  if (!runtime) return "Unavailable";
  if (!runtime.on) return "Off";
  return runtime.override?.active ? "On · manual" : "On";
}

export default function InMapWorkbench({
  inventory,
  live,
  stale,
  selectedRoomId,
  onSelectRoom,
  mutateDisabled,
  devicePendingId,
  onDeviceCommand,
}: {
  inventory: Inventory;
  live: WorkbenchLiveData | null;
  stale: boolean;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  mutateDisabled: boolean;
  devicePendingId: string | null;
  onDeviceCommand:
    | ((deviceId: string, control: "on" | "off" | "clear") => void)
    | null;
}) {
  const roomPower = inventory.rooms.map((room) => roomState(live, room.room_id)?.power_w ?? null);
  const devicePower = inventory.devices.map((device) => deviceState(live, device.device_id)?.power_w ?? null);
  const maxRoomPower = Math.max(0, ...roomPower.filter((value): value is number => value !== null));
  const maxDevicePower = Math.max(0, ...devicePower.filter((value): value is number => value !== null));
  const roomNames = new Map(inventory.rooms.map((room) => [room.room_id, room.name]));
  const officePower = live
    ? [...live.devices.values()].reduce((sum, device) => sum + device.power_w, 0)
    : null;
  const officeEnergy = live
    ? [...live.devices.values()].reduce((sum, device) => sum + device.energy_kwh, 0)
    : null;
  const reportedOccupancy = live
    ? [...live.rooms.values()].reduce((sum, room) => sum + room.occupancy, 0)
    : null;

  return (
    <section className="sim-workbench" aria-label="Live office data workspace">
      <div className="sim-workbench-head">
        <div>
          <h3 className="sim-panel-title">Live office data</h3>
          <p className="sim-muted sim-small">
            Full office, rooms, equipment, relative power heatmap, and controls in the map workspace.
          </p>
        </div>
        <span className={`sim-pill ${stale ? "sim-pill-warn" : ""}`}>
          {stale ? "stale — last known values" : live ? "live values" : "runtime unavailable"}
        </span>
      </div>

      <div className="sim-workbench-summary">
        <Metric label="Office power" value={formatPower(officePower)} />
        <Metric label="Office energy" value={formatEnergy(officeEnergy)} />
        <Metric label="Reported occupancy" value={formatOccupancy(reportedOccupancy)} />
        <Metric label="Inventory devices" value={String(inventory.devices.length)} />
      </div>

      <div className="sim-workbench-section">
        <div className="sim-workbench-section-head">
          <h4>Room power heatmap</h4>
          <span className="sim-muted sim-small">Relative to the highest reported room power</span>
        </div>
        <div className="sim-heatmap" role="group" aria-label="Room power heatmap">
          {inventory.rooms.map((room) => {
            const runtime = roomState(live, room.room_id);
            const selected = selectedRoomId === room.room_id;
            return (
              <button
                key={room.room_id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectRoom(room.room_id)}
                className={`sim-heat-cell ${selected ? "sim-heat-cell-selected" : ""}`}
                style={{ backgroundColor: heatColor(runtime?.power_w ?? null, maxRoomPower) }}
              >
                <span className="sim-heat-name">{room.name}</span>
                <strong>{formatPower(runtime?.power_w ?? null)}</strong>
                <small>{formatOccupancy(runtime?.occupancy ?? null)}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sim-workbench-section">
        <div className="sim-workbench-section-head">
          <h4>Equipment power heatmap</h4>
          <span className="sim-muted sim-small">Relative to the highest reported device power</span>
        </div>
        <div className="sim-heatmap" role="group" aria-label="Equipment power heatmap">
          {inventory.devices.map((device) => {
            const runtime = deviceState(live, device.device_id);
            const selected = selectedRoomId === device.room_id;
            return (
              <button
                key={device.device_id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectRoom(device.room_id)}
                className={`sim-heat-cell ${selected ? "sim-heat-cell-selected" : ""}`}
                style={{ backgroundColor: heatColor(runtime?.power_w ?? null, maxDevicePower) }}
              >
                <span className="sim-heat-name">{device.name}</span>
                <strong>{formatPower(runtime?.power_w ?? null)}</strong>
                <small>{roomNames.get(device.room_id) ?? device.room_id} · {stateLabel(runtime)}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sim-workbench-section">
        <div className="sim-workbench-section-head">
          <h4>Room live readings</h4>
          <span className="sim-muted sim-small">Voltage/current are not reported by the current state API</span>
        </div>
        <div className="sim-table-wrap">
          <table className="sim-data-table">
            <thead>
              <tr><th>Room</th><th>Occupancy</th><th>Power</th><th>Energy</th><th>V / A</th></tr>
            </thead>
            <tbody>
              {inventory.rooms.map((room) => {
                const runtime = roomState(live, room.room_id);
                return (
                  <tr key={room.room_id}>
                    <td><button type="button" className="sim-table-link" onClick={() => onSelectRoom(room.room_id)}>{room.name}</button></td>
                    <td>{formatOccupancy(runtime?.occupancy ?? null)}</td>
                    <td>{formatPower(runtime?.power_w ?? null)}</td>
                    <td>{formatEnergy(runtime?.energy_kwh ?? null)}</td>
                    <td className="sim-unavailable">Unavailable</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sim-workbench-section">
        <div className="sim-workbench-section-head">
          <h4>Equipment live readings</h4>
          <span className="sim-muted sim-small">Hover the map for a compact reading; use controls here for commands</span>
        </div>
        <div className="sim-table-wrap">
          <table className="sim-data-table">
            <thead>
              <tr><th>Room</th><th>Equipment</th><th>State</th><th>Power</th><th>Energy</th><th>V / A</th><th>Control</th></tr>
            </thead>
            <tbody>
              {inventory.devices.map((device) => {
                const runtime = deviceState(live, device.device_id);
                const controllable = isSwitchControllable(device);
                const pending = devicePendingId === device.device_id;
                return (
                  <tr key={device.device_id}>
                    <td>{roomNames.get(device.room_id) ?? device.room_id}</td>
                    <td><span className="sim-table-device">{device.name}</span><small>{device.device_type}</small></td>
                    <td>{stateLabel(runtime)}</td>
                    <td>{formatPower(runtime?.power_w ?? null)}</td>
                    <td>{formatEnergy(runtime?.energy_kwh ?? null)}</td>
                    <td className="sim-unavailable">Unavailable</td>
                    <td>
                      {controllable ? (
                        <div className="sim-table-controls">
                          <button type="button" disabled={mutateDisabled || pending || !onDeviceCommand} onClick={() => onDeviceCommand?.(device.device_id, "on")}>On</button>
                          <button type="button" disabled={mutateDisabled || pending || !onDeviceCommand} onClick={() => onDeviceCommand?.(device.device_id, "off")}>Off</button>
                          <button type="button" disabled={mutateDisabled || pending || !onDeviceCommand} onClick={() => onDeviceCommand?.(device.device_id, "clear")}>Clear</button>
                        </div>
                      ) : <span className="sim-muted">Not switch-capable</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="sim-workbench-note">
        Heatmap color represents reported relative power only. Missing runtime values remain unavailable; no voltage, current, or occupancy values are fabricated.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="sim-workbench-metric"><span>{label}</span><strong>{value}</strong></div>;
}
