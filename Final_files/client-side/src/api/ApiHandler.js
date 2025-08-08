import axios from "axios";
import { Methods } from "./Api";
export const apiHandler = {
  PostApi: async (url, data, token) => {
    // console.log("jnkjnjknjknjk",url);
    let result = {};
    let headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    let config = {
      method: Methods.Post,
      maxBodyLength: Infinity,
      url: url,
      headers: headers,
      data: data,
    };
    await axios
      .request(config)
      .then(async (response) => {
        result = await response.data;
      })
      .catch(async (error) => {
        result = await error.response.data;
      });
    return result;
  },
PostApiWithoutToken: async (url, data) => {
  let result = {};

  const config = {
    method: Methods.Post,
    url: url,
    headers: {
      "Content-Type": "application/json",
      // ❌ DO NOT manually set Cookie
    },
    data: data,
    withCredentials: true, // ✅ Tell Axios to include cookies automatically
    maxBodyLength: Infinity,
  };

  await axios
    .request(config)
    .then(async (response) => {
      result = await response.data;
    })
    .catch(async (error) => {
      result = await error?.response?.data || { message: "Network error" };
    });

  return result;
},


  GetApi: async (url, token) => {
    let result = {};
    let config = {
      method: Methods.Get,
      maxBodyLength: Infinity,
      url: url,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
    await axios
      .request(config)
      .then(async (response) => {
        result = await response.data;
      })
      .catch(async (error) => {
        result = await error.response.data;
      });
    return result;
  },

  PutApi: async (url, data, token) => {
    console.log(url, data, token);
    let result = {};
    let config = {
      method: Methods.Put,
      maxBodyLength: Infinity,
      url: url,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      data: data,
    };
    await axios
      .request(config)
      .then(async (response) => {
        result = await response.data;
      })
      .catch(async (error) => {
        result = await error?.response?.data?.error;
      });
    return result;
  },

  UpdateApi: async (url, data, token, isFormData = false) => {
    let result = {};
    let headers = {
      Authorization: `Bearer ${token}`,
    };
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }
    let config = {
      method: "patch",
      maxBodyLength: Infinity,
      url: url,
      headers: headers,
      data: data,
    };
    await axios
      .request(config)
      .then(async (response) => {
        result = await response.data;
      })
      .catch(async (error) => {
        result = await error?.response?.data;
      });
    return result;
  },

  DeleteApi: async (url, Token) => {
    let result = {};
    let config = {
      method: Methods.Delete,
      maxBodyLength: Infinity,
      url: url,
      headers: {
        Authorization: `Bearer ${Token}`,
      },
    };

    await axios
      .request(config)
      .then(async (response) => {
        result = response.data;
      })
      .catch(async (error) => {
        result = await error.response.data;
      });
    return result;
  },
  postApiWithToken: async (url, data, token) => {
    try {
      const response = await axios({
        method: "POST",
        url,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        data,
      });
      return response.data;
    } catch (error) {
      return error.response?.data || { success: false, message: "API error" };
    }
  },
  imageUpload: async (url, data, accessToken, onProgress) => {
    let result = [];
    try {
      const requestOptions = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: data,
      };

      if (onProgress) {
        // Use XMLHttpRequest for progress tracking
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              onProgress(percentComplete);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (error) {
                resolve({ success: false, message: "Invalid response format" });
              }
            } else {
              reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error"));
          });

          xhr.open("POST", url);
          xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
          xhr.send(data);
        });
      } else {
        // Fallback to fetch for backward compatibility
        const response = await fetch(url, requestOptions);
        result = await response.json();
      }
    } catch (error) {
      result = await error;
    }
    return result;
  },
  uploadDoc: async (formdata) => {
    const requestOptions = {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
      },

      body: formdata,
      redirect: "follow",
    };

    fetch(
      "http://74.208.206.18:4020/upload/document/multiple?modelName=users",
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => console.log(result))
      .catch((error) => console.error(error));
  },
};
