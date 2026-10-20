import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getMe, sendOtp, verifyOtp } from "../api/auth";
import { getErrorMessage } from "../api/client";

export const requestOtp = createAsyncThunk("auth/sendOtp", async (phone, { rejectWithValue }) => {
  try {
    const { data } = await sendOtp(phone);
    return { phone, message: data.message };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const confirmOtp = createAsyncThunk("auth/verifyOtp", async ({ phone, otp }, { rejectWithValue }) => {
  try {
    const { data } = await verifyOtp(phone, otp);
    return data.user;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchMe = createAsyncThunk("auth/me", async (_, { rejectWithValue }) => {
  try {
    const { data } = await getMe();
    return data.user;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    phone: "",
    status: "idle",
    ready: false,
    otpSent: false,
    error: ""
  },
  reducers: {
    clearAuthError(state) {
      state.error = "";
    },
    logoutLocal(state) {
      state.user = null;
      state.otpSent = false;
      state.phone = "";
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestOtp.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(requestOtp.fulfilled, (state, action) => {
        state.status = "idle";
        state.otpSent = true;
        state.phone = action.payload.phone;
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.status = "idle";
        state.error = action.payload;
      })
      .addCase(confirmOtp.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(confirmOtp.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload;
      })
      .addCase(confirmOtp.rejected, (state, action) => {
        state.status = "idle";
        state.error = action.payload;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.ready = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.ready = true;
      });
  }
});

export const { clearAuthError, logoutLocal } = authSlice.actions;
export default authSlice.reducer;
