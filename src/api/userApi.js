import { API_URL } from "react-native-dotenv";
import { httpGateway } from "@/services/gateways";

export const login = async (email, password) => {
  const response = await httpGateway.post(`${API_URL}/login`, { email, password });
  return response.data;
};
