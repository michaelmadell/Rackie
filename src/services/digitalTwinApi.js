async function handleResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }
  return data;
}

// --- Rooms ---
export async function getRooms(locationId) {
  const res = await fetch(`/api/rooms?locationId=${encodeURIComponent(locationId)}`);
  return handleResponse(res);
}

export async function getRoomFull(roomId) {
  const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/full`);
  return handleResponse(res);
}

export async function createRoom(data) {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateRoom(id, data) {
  const res = await fetch(`/api/rooms/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteRoom(id) {
  const res = await fetch(`/api/rooms/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

// --- Racks ---
export async function getRacks(roomId) {
  const res = await fetch(`/api/racks?roomId=${encodeURIComponent(roomId)}`);
  return handleResponse(res);
}

export async function createRack(data) {
  const res = await fetch('/api/racks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateRack(id, data) {
  const res = await fetch(`/api/racks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteRack(id) {
  const res = await fetch(`/api/racks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

// --- Device Templates (Device Library) ---
export async function getDeviceTemplates(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);
  if (filters.manufacturer) params.append('manufacturer', filters.manufacturer);

  const query = params.toString();
  const url = query ? `/api/device-templates?${query}` : '/api/device-templates';
  const res = await fetch(url);
  return handleResponse(res);
}

export async function createDeviceTemplate(data) {
  const res = await fetch('/api/device-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteDeviceTemplate(id) {
  const res = await fetch(`/api/device-templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

// --- Devices ---
export async function getDevices(rackId) {
  const res = await fetch(`/api/devices?rackId=${encodeURIComponent(rackId)}`);
  return handleResponse(res);
}

export async function createDevice(data) {
  const res = await fetch('/api/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateDevice(id, data) {
  const res = await fetch(`/api/devices/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteDevice(id) {
  const res = await fetch(`/api/devices/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}

// --- Cables ---
export async function getCables(roomId) {
  const res = await fetch(`/api/cables?roomId=${encodeURIComponent(roomId)}`);
  return handleResponse(res);
}

export async function createCable(data) {
  const res = await fetch('/api/cables', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateCable(id, data) {
  const res = await fetch(`/api/cables/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteCable(id) {
  const res = await fetch(`/api/cables/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(res);
}
