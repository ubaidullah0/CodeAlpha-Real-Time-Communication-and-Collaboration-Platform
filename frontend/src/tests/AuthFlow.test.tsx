import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ForgotPassword from '../pages/ForgotPassword';
import VerifyOtp from '../pages/VerifyOtp';
import ResetPassword from '../pages/ResetPassword';
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as Record<string, unknown>,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      search: '?email=test@example.com&token=fake-token'
    })
  };
});

describe('Forgot Password Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ForgotPassword Component', () => {
    it('renders and validates input', async () => {
      render(
        <BrowserRouter>
          <ForgotPassword />
        </BrowserRouter>
      );
      expect(screen.getByText(/Reset your password/i)).toBeInTheDocument();
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' })
      });

      const input = screen.getByLabelText(/Email address/i);
      const btn = screen.getByRole('button', { name: /Send reset code/i });

      fireEvent.change(input, { target: { value: 'test@example.com' } });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/forgot-password', expect.any(Object));
        expect(mockNavigate).toHaveBeenCalledWith('/verify-otp?email=test%40example.com');
      });
    });
  });

  describe('VerifyOtp Component', () => {
    it('renders and handles 6-digit OTP correctly', async () => {
      render(
        <BrowserRouter>
          <VerifyOtp />
        </BrowserRouter>
      );
      
      expect(screen.getByRole('heading', { name: /Verify Email/i })).toBeInTheDocument();
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ resetToken: 'fake-token' })
      });

      const inputs = screen.getAllByRole('textbox');
      const btn = screen.getByRole('button', { name: /Verify Code/i });

      // Should be disabled when empty
      expect(btn).toBeDisabled();
      
      // Simulate typing all digits into the first box (our handleOtpChange will join them if paste-like, but actually let's use paste or just set value)
      // Since it's a React state, typing a 6-digit string into the first box's onChange triggers setOtp with that string
      act(() => {
        inputs[0].focus();
        // Simulating the way a user might paste 123456
        const pasteEvent = new window.Event('paste', { bubbles: true }) as unknown as ClipboardEvent;
        Object.defineProperty(pasteEvent, 'clipboardData', {
          value: { getData: () => '123456' }
        });
        inputs[0].dispatchEvent(pasteEvent);
      });

      await waitFor(() => {
        expect(btn).not.toBeDisabled();
      });

      act(() => {
        btn.click();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify-reset-otp', expect.any(Object));
        expect(mockNavigate).toHaveBeenCalledWith('/reset-password?token=fake-token');
      });
    });
  });

  describe('ResetPassword Component', () => {
    it('validates password matching and length', async () => {
      render(
        <BrowserRouter>
          <ResetPassword />
        </BrowserRouter>
      );
      
      const newPass = screen.getByLabelText(/New Password/i);
      const confirmPass = screen.getByLabelText(/Confirm Password/i);
      const btn = screen.getByRole('button', { name: /Reset Password/i });

      const form = btn.closest('form') as HTMLFormElement;

      // Mismatch
      fireEvent.change(newPass, { target: { value: 'password123' } });
      fireEvent.change(confirmPass, { target: { value: 'different' } });
      fireEvent.submit(form);
      
      expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();

      // Too short
      fireEvent.change(newPass, { target: { value: '123' } });
      fireEvent.change(confirmPass, { target: { value: '123' } });
      fireEvent.submit(form);
      
      expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();

      // Success
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' })
      });

      fireEvent.change(newPass, { target: { value: 'validpassword' } });
      fireEvent.change(confirmPass, { target: { value: 'validpassword' } });
      fireEvent.submit(form);

      expect(await screen.findByText(/Password Reset Successful/i)).toBeInTheDocument();
    });
  });
});
