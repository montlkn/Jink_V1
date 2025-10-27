import axios from "axios";

export const httpClient = axios.create();

export const httpGateway = {
  get: httpClient.get.bind(httpClient),
  post: httpClient.post.bind(httpClient),
  put: httpClient.put.bind(httpClient),
  patch: httpClient.patch.bind(httpClient),
  delete: httpClient.delete.bind(httpClient),
};
