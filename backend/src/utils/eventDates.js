const isDateOnlyValue = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

const getDateOnlyKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export const normalizeEventDatePayload = (payload) => {
  const normalized = { ...payload };

  if (isDateOnlyValue(payload.registrationStartDate)) {
    normalized.registrationStartDate = new Date(`${payload.registrationStartDate}T00:00:00`);
  }

  if (isDateOnlyValue(payload.registrationEndDate)) {
    normalized.registrationEndDate = new Date(`${payload.registrationEndDate}T23:59:59.999`);
  }

  if (isDateOnlyValue(payload.eventDate)) {
    normalized.eventDate = new Date(`${payload.eventDate}T12:00:00`);
  }

  return normalized;
};

export const isRegistrationOpen = (event) => {
  return getRegistrationAvailability(event).open;
};

export const getRegistrationAvailability = (event) => {
  const now = new Date();

  if (event.status && !["open", "ongoing"].includes(event.status)) {
    return {
      open: false,
      reason: "Event is not open for registration",
    };
  }

  const todayKey = getDateOnlyKey(now);
  const startKey = getDateOnlyKey(event.registrationStartDate);
  const endKey = getDateOnlyKey(event.registrationEndDate);

  if (startKey && todayKey < startKey) {
    return {
      open: false,
      reason: "Registration has not started yet",
    };
  }

  if (endKey && todayKey > endKey) {
    return {
      open: false,
      reason: "Registration has closed",
    };
  }

  return {
    open: true,
    reason: "Registration is open",
  };
};

export const validateEventDateOrder = (payload) => {
  const startKey = getDateOnlyKey(payload.registrationStartDate);
  const endKey = getDateOnlyKey(payload.registrationEndDate);
  const eventKey = getDateOnlyKey(payload.eventDate);

  if (startKey && endKey && endKey < startKey) {
    return "registrationEndDate must be after registrationStartDate";
  }

  if (endKey && eventKey && eventKey < endKey) {
    return "eventDate must be after registrationEndDate";
  }

  return null;
};
