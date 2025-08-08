import { api_url } from '@/api/Api';
import { apiHandler } from '@/api/ApiHandler';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Section_a = () => {
  const [otp, setOtp] = useState('');
  const [Loading, setLoading] = useState(false)
  const navigate = useNavigate();
  const [Message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { state } = useLocation();
  const email = state?.email || 'your email';

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!otp.trim()) {
      setError("OTP is required");
      setLoading(false);
      return;
    }

    try {
      const obj = { email, otp };

      const response = await apiHandler.PostApiWithoutToken(api_url.verify_Otp, obj);
      if (response?.message === "OTP verified successfully") {
        setMessage("OTP verified. Redirecting...");
        navigate("/ResetPassword", { state: { email } });
      } else {
        setError(response?.message || "Invalid OTP");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const obj = { email };
      const response = await apiHandler.PostApiWithoutToken(api_url.verify_Otp, obj);

      if (response?.message === "OTP sent to email") {
        setMessage("OTP has been resent to your email.");
      } else {
        setError(response?.message || "Failed to resend OTP.");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
      <button
        onClick={() => navigate("/login")}
        className="absolute top-6 left-6 bg-white border border-blue-200 text-blue-700 px-4 py-1 rounded-md font-medium shadow hover:bg-blue-100 transition"
      >
        ← Back
      </button>

      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-800">Verify Your Email</h2>
        <p className="text-sm text-gray-600 mt-2">
          We've sent a 6-digit code to <span className="font-semibold">{email}</span>
        </p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
            className="w-full text-center tracking-widest font-mono text-lg px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter 6-digit code"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition"
          >
            Verify & Continue
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          Didn't receive the code?{' '}
          <button
            type="button"
            onClick={handleResendOtp}
            className="text-blue-600 hover:underline font-medium"
          >
            Resend OTP
          </button>
        </p>
      </div>
    </div>
  );
};

export default Section_a;
