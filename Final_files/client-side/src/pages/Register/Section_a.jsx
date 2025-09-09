import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { Eye, EyeOff } from "lucide-react";
import CustomLoader from "@/components/CustomLoader";
import CustomToast from "@/components/CustomToast";

const Section_a = () => {
  useAuthRedirect();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company_Name: "",
    companyDomain: "",
    email: "",
    companyID: "",
    companyAddress: "",
    founded_year: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = "Required";
    if (!form.lastName.trim()) newErrors.lastName = "Required";
    if (!form.company_Name.trim()) newErrors.company_Name = "Required";
    if (!form.companyDomain.trim()) newErrors.companyDomain = "Required";
    if (!form.email.trim()) newErrors.email = "Required";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Invalid Email";
    if (!form.companyID.trim()) newErrors.companyID = "Required";
    if (!form.companyAddress.trim()) newErrors.companyAddress = "Required";
    if (!form.founded_year.trim()) newErrors.founded_year = "Required";
    if (!form.password.trim()) newErrors.password = "Required";
    if (!form.confirmPassword.trim()) newErrors.confirmPassword = "Required";
    else if (form.password !== form.confirmPassword)
      newErrors.confirmPassword =
        "Passwords and confirm Password  do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();
    if (!validate()) {
      return;
    }
    setTimeout(() => {
      registerHandler(form);
    }, 500);
  };

  const registerHandler = async (form) => {
    try {
      const obj = {
        companyName: form.company_Name,
        companyDomain: form.companyDomain,
        email: form.email,
        companyID: form.companyID,
        companyAddress: form.companyAddress,
        founded_year: Number(form.founded_year),
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
        confirmPassword: form.confirmPassword,
      };

      const response = await apiHandler.PostApi(api_url.register, obj);

      if (
        response &&
        (response.message === "Registered as owner" || response.success)
      ) {
        setLoading(false);
        CustomToast.success(response?.message);
        navigate("/Login");
      } else {
        setLoading(false);
        CustomToast.error(response?.message || response?.error);
      }
    } catch (error) {
      CustomToast.error(error?.message || "Something went wrong");
      setLoading(false);
    } finally {
      setLoading(false); // hide loader when API is done
    }
  };

  return (
    <>
      {loading && <CustomLoader />}
      <div className="min-h-screen flex items-center justify-center bg-[#dbeafe] px-4 py-12 font-sans">
        <button
          onClick={() => navigate("/")}
          className="absolute top-6 left-6 bg-white/80 border border-blue-200 text-blue-700 px-4 py-1 rounded-md font-semibold shadow-sm hover:bg-blue-50 transition z-20"
        >
          ← Home
        </button>
        <div className="w-full max-w-3xl bg-white/90 rounded-2xl shadow-xl border border-blue-100 p-6 sm:p-10 flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <svg
              width="38"
              height="38"
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="44" height="44" rx="12" fill="#2563eb" />
              <path
                d="M13 29L22 15L31 29"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xl font-bold text-blue-700 tracking-tight">
              WorkOrbit
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-12">
            Register Your Company
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            <InputField
              label="Company Name"
              name="company_Name"
              value={form.company_Name}
              onChange={handleChange}
              error={errors.company_Name}
            />

            <InputField
              label="Company Domain"
              name="companyDomain"
              placeholder="example.com"
              value={form.companyDomain}
              onChange={handleChange}
              error={errors.companyDomain}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <InputField
                label="First Name"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                error={errors.firstName}
              />
              <InputField
                label="Last Name"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                error={errors.lastName}
              />
            </div>

            <InputField
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
            />

            <InputField
              label="Company ID"
              name="companyID"
              value={form.companyID}
              onChange={handleChange}
              error={errors.companyID}
            />

            <InputField
              label="Company Address"
              name="companyAddress"
              value={form.companyAddress}
              onChange={handleChange}
              error={errors.companyAddress}
            />

            <InputField
              label="Founded Year"
              name="founded_year"
              type="number"
              value={form.founded_year}
              onChange={handleChange}
              error={errors.founded_year}
            />

            {/* Password with Eye Toggle */}
            <InputField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              showToggle
              toggleHandler={() => setShowPassword(!showPassword)}
              isVisible={showPassword}
            />

            <InputField
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              showToggle
              toggleHandler={() => setShowConfirmPassword(!showConfirmPassword)}
              isVisible={showConfirmPassword}
            />

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold shadow-sm transition"
            >
              Register
            </button>

            <p className="text-center text-sm text-blue-600 mt-4">
              Already have an account?{" "}
              <Link to="/Login" className="font-medium underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

const InputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
  showToggle = false,
  toggleHandler,
  isVisible,
}) => (
  <div className="relative">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        name={name}
        id={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`mt-1 block w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? "border-red-400" : "border-gray-300"
        } bg-white/80 text-gray-900`}
      />
      {showToggle && (
        <button
          type="button"
          onClick={toggleHandler}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      )}
    </div>
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);

export default Section_a;
