import api from "./api";

export const getCoordinators = async () => {
  const { data } = await api.get("/admin/users?role=coordinator");
  return data;
};

export const createCoordinator = async (payload) => {
  const { data } = await api.post("/admin/users", payload);
  return data;
};
