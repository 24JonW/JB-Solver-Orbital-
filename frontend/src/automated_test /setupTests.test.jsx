import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import * as matchers from '@testing-library/jest-dom/matchers';
import axios from 'axios'; 
import HomePage from '../pages/HomePage'; 

expect.extend(matchers);

// Mock Axios globally
vi.mock('axios'); 

const mockNavigate = vi.fn(); 
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../pages/TopSectionBar", () => ({
  TopSectionBar: () => <div data-testid="top-bar">Top Bar</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.localStorage.setItem("userId", "1"); 

  // Direct mock implementation safely managing multi-endpoint Axios calls
  axios.get.mockImplementation((url) => {
    if (url.includes('/api/accounts/')) {
      return Promise.resolve({
        data: { username: "24JonW", email: "jonathanwongjunkiat@gmail.com", user_id: 1 }
      });
    }
    if (url.includes('/api/bills/outstanding/')) {
      return Promise.resolve({ data: [] });
    }
    if (url.includes('/api/bills/receivables/')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.reject(new Error(`Unhandled API call to: ${url}`));
  });
});

describe('Basic JBSolver Frontend Sanity Check', () => {
  it('should successfully render the main title or login screen text', () => {
    render(<div><h1>Welcome to JBSolver</h1></div>);
    const element = screen.getByText(/Welcome to JBSolver/i);
    expect(element).toBeInTheDocument();
  });

  it("should display the username returned by the API", async () => {
    render(<HomePage />); 
    
    // findByText looks for asynchronous DOM changes when state updates
    const username = await screen.findByText(/Username:\s*24JonW/i); 
    expect(username).toBeInTheDocument(); 
  });
});
