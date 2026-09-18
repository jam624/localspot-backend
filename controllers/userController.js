// controllers/userController.js
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';   // ← fixed
import { sendOTPEmail, generateOTP } from '../utils/resendOTP.js';
import generateToken from '../utils/generateToken.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------ helpers ------------------------------ */

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const issueOTP = async (user) => {
  const otp = generateOTP(6);

  user.otp = otp;
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save({ validateBeforeSave: false });

  try {
    await sendOTPEmail({ to: user.email, name: user.name, otp });
  } catch (err) {
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });
    throw err;
  }

  return otp;
};

/* ----------------------------- controllers ---------------------------- */

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return fail(res, 400, 'Name, email and password are required');
    }
    if (!EMAIL_RE.test(email)) {
      return fail(res, 400, 'Please provide a valid email address');
    }
    if (password.length < 8) {
      return fail(res, 400, 'Password must be at least 8 characters');
    }

    const normalizedEmail = normalizeEmail(email);

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return fail(res, 409, 'An account with this email already exists');
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    generateToken(res, user._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[register]', err);
    return fail(res, 500, 'Something went wrong while creating your account');
  }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return fail(res, 400, 'Email and password are required');
    }

    const user = await User.findOne({ email: normalizeEmail(email) }).select(
      '+password'
    );

    if (!user || !(await user.comparePassword(password))) {
      return fail(res, 401, 'Invalid email or password');
    }

    generateToken(res, user._id);

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[login]', err);
    return fail(res, 500, 'Something went wrong while signing you in');
  }
};

// @desc    Logout user (clear jwt cookie)
// @route   POST /api/users/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    res.cookie('jwt', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      expires: new Date(0),
      path: '/',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    console.error('[logout]', err);
    return fail(res, 500, 'Something went wrong while logging you out');
  }
};

// @desc    Get the logged-in user's profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) return fail(res, 404, 'User not found');

    return res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (err) {
    console.error('[getUserProfile]', err);
    return fail(res, 500, 'Something went wrong while fetching your profile');
  }
};

// @desc    Request a password-reset OTP
// @route   POST /api/users/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_RE.test(email)) {
      return fail(res, 400, 'Please provide a valid email address');
    }

    const user = await User.findOne({ email: normalizeEmail(email) });

    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a reset code has been sent.',
    };

    if (!user) return res.status(200).json(genericResponse);

    await issueOTP(user);

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error('[forgotPassword]', err);
    return fail(res, 502, 'Could not send the reset code. Please try again.');
  }
};

// @desc    Re-send a password-reset OTP (with cooldown)
// @route   POST /api/users/resend-otp
// @access  Public
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_RE.test(email)) {
      return fail(res, 400, 'Please provide a valid email address');
    }

    const user = await User.findOne({ email: normalizeEmail(email) }).select(
      '+otp +otpExpiresAt +otpLastSentAt'
    );

    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a new code has been sent.',
    };

    if (!user) return res.status(200).json(genericResponse);

    if (
      user.otpLastSentAt &&
      Date.now() - new Date(user.otpLastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS
    ) {
      const seconds = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS -
          (Date.now() - new Date(user.otpLastSentAt).getTime())) /
          1000
      );
      return fail(res, 429, `Please wait ${seconds}s before requesting another code.`);
    }

    await issueOTP(user);

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error('[resendOTP]', err);
    return fail(res, 502, 'Could not send the code. Please try again.');
  }
};

// @desc    Verify OTP and exchange it for a short-lived reset token
// @route   POST /api/users/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return fail(res, 400, 'Email and code are required');
    }

    const user = await User.findOne({ email: normalizeEmail(email) }).select(
      '+otp +otpExpiresAt +otpAttempts'
    );

    if (!user || !user.otp || !user.otpExpiresAt) {
      return fail(res, 400, 'Invalid or expired code');
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      user.otpAttempts = 0;
      await user.save({ validateBeforeSave: false });
      return fail(res, 400, 'Code has expired. Please request a new one.');
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return fail(res, 429, 'Too many attempts. Please request a new code.');
    }

    if (user.otp !== String(otp)) {
      user.otpAttempts += 1;
      await user.save({ validateBeforeSave: false });
      return fail(res, 400, 'Invalid or expired code');
    }

    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    return res.status(200).json({
      success: true,
      message: 'Code verified',
      resetToken,
    });
  } catch (err) {
    console.error('[verifyOTP]', err);
    return fail(res, 500, 'Something went wrong while verifying the code');
  }
};

// @desc    Reset password using the token from verifyOTP
// @route   POST /api/users/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, password } = req.body;

    if (!resetToken || !password) {
      return fail(res, 400, 'Reset token and new password are required');
    }
    if (password.length < 8) {
      return fail(res, 400, 'Password must be at least 8 characters');
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return fail(res, 400, 'Reset link is invalid or has expired');
    }

    if (decoded.purpose !== 'password_reset') {
      return fail(res, 400, 'Reset link is invalid or has expired');
    }

    const user = await User.findById(decoded.id).select('+password');
    if (!user) return fail(res, 404, 'User not found');

    user.password = password;
    user.passwordChangedAt = new Date();
    await user.save();

    generateToken(res, user._id);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[resetPassword]', err);
    return fail(res, 500, 'Something went wrong while resetting your password');
  }
};