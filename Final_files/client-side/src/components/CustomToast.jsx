// src/components/Toast.js
import { toast } from "react-toastify";

const CustomToast = {
  success: (message, options = {}) =>
    toast.success(message, { position: "top-right", autoClose: 2000, ...options }),

  error: (message, options = {}) =>
    toast.error(message, { position: "top-right", autoClose: 2000, ...options }),

  info: (message, options = {}) =>
    toast.info(message, { position: "top-right", autoClose: 2000, ...options }),

  warning: (message, options = {}) =>
    toast.warning(message, { position: "top-right", autoClose: 2000, ...options }),
};

export default CustomToast;
