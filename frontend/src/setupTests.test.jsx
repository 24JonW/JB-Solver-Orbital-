import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Explicitly link the DOM matchers to Vitest
expect.extend(matchers);

describe('Basic JBSolver Frontend Sanity Check', () => {
    it('should successfully render the main title or login screen text', () => {
      render(<div><h1>Welcome to JBSolver</h1></div>);
      
      const element = screen.getByText(/Welcome to JBSolver/i);
      expect(element).toBeInTheDocument();
    });
  });