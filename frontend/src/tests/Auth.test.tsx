import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

describe('Frontend Authentication Flow', () => {
  beforeEach(() => {
    // Mock fetch for health endpoint and initial auth check
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Authentication required' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'success', backend: 'Connected', database: 'Connected' }),
      });
    });
  });

  it('redirects to login when unauthenticated', async () => {
    render(<App />);
    
    // Should see login form
    await waitFor(() => {
      expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    });
  });

  it('shows register page when link is clicked', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Create one now/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Create an Account/i)).toBeInTheDocument();
    });
  });
});
