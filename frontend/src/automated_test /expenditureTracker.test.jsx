import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import axios from 'axios';
import ExpenditureTracker from '../pages/ExpenditureTracker';

expect.extend(matchers);

// Mock Axios network boundaries
vi.mock('axios');

// Mock jwt-decode to safely bypass encryption checks
vi.mock('jwt-decode', () => ({
  jwtDecode: () => ({ id: 5, username: 'zhuofan41' })
}));

// Mock chart modules to prevent virtual canvas layer errors
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart">Mock Bar Chart</div>,
  Line: () => <div data-testid="mock-line-chart">Mock Line Chart</div>,
  Pie: () => <div data-testid="mock-pie-chart">Mock Pie Chart</div>,
}));

// Mock global sub-layouts
vi.mock('../pages/TopSectionBar', () => ({
  TopSectionBar: () => <div data-testid="top-bar">Top Bar</div>,
}));
vi.mock('../pages/FooterSection', () => ({
  FooterSection: () => <div data-testid="footer-bar">Footer Bar</div>,
}));

// Mock window confirm overrides globally
global.confirm = vi.fn(() => true);
global.alert = vi.fn();

beforeEach(() => {
vi.clearAllMocks();
window.localStorage.clear();
window.localStorage.setItem("token", "dummy-jwt-token-string");

// Intercept backend axios calls
axios.get.mockImplementation((url) => {
    // 1. Handle user history ledger loading query
    if (url.includes('/api/exp/transaction/5')) {
    return Promise.resolve({
        data: [
        { bill_id: 11, category: 'Food', description: 'Chicken Rice Splurge', total_amount: 10.00, net_amount: 10.90, currency: 'SGD', exchange_rate: 1, bill_date: '2026-07-15T00:00:00.000Z' }
        ]
    });
    }
    // 2. Handle dynamically loaded monthly targeted budget query
    if (url.includes('/api/exp/budget/5/')) {
        return Promise.resolve({ data: { budget_amount: 500.00 } });
    }
    // 3. Handle third-party currency base API calls
    if (url.includes('open.er-api.com')) {
        return Promise.resolve({
            data: {
            rates: { SGD: 1.34, MYR: 4.72, USD: 1.00 }
            }
        });
    }
    return Promise.resolve({ data: [] });
});

axios.post.mockResolvedValue({
    status: 200,
    data: { transaction: { bill_id: 12, category: 'Transport', description: 'Taxi to NUS', total_amount: 20, net_amount: 20, currency: 'SGD' } }
});

axios.delete.mockResolvedValue({ status: 200, data: { success: true } });
});

describe('JBSolver ExpenditureTracker automated testing', () => {

    it('should parse user profiles and compute layout dashboard summaries accurately on mount', async () => {
        render(
            <MemoryRouter>
                <ExpenditureTracker />
            </MemoryRouter>
        );

        expect(screen.getByTestId('top-bar')).toBeInTheDocument();
        
        const budgetCardValue = await screen.findByText('$500.00');
        expect(budgetCardValue).toBeInTheDocument();

        expect(screen.getByText('$10.90')).toBeInTheDocument();
        expect(screen.getByText('Description: Chicken Rice Splurge')).toBeInTheDocument();
    });

    it('should launch the subtotal builder modal, calculate internal complex taxes math rules, and submit data successfully', async () => {
        const { container } = render(
        <MemoryRouter>
            <ExpenditureTracker />
        </MemoryRouter>
        );

        await screen.findByText('$500.00');

        const addExpenseBtn = container.querySelector('.exp-btn');
        fireEvent.click(addExpenseBtn);

        expect(screen.getByText('Add Personal Expenditure')).toBeInTheDocument();

        fireEvent.change(container.querySelector('input[name="description"]'), { target: { value: 'Grab ride home' } });
        fireEvent.change(container.querySelector('input[name="total_amount"]'), { target: { value: '20' } });
        fireEvent.change(container.querySelector('.GSTInput'), { target: { value: '9' } });
        fireEvent.change(container.querySelector('.addition_TaxLabel + input'), { target: { value: '10' } });

        const totalAmountDisplays = screen.getAllByText(/SGD 23.80/);
        expect(totalAmountDisplays.length).toBeGreaterThanOrEqual(1);

        const saveButton = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/api/exp/transaction'),
                expect.objectContaining({
                description: 'Grab ride home',
                total_amount: 20,
                net_amount: 23.8
                })
            );
        });
    });

    it('should launch budget settings modal context and send data values to backend routes', async () => {
        const { container } = render(
        <MemoryRouter>
            <ExpenditureTracker />
        </MemoryRouter>
        );

        await screen.findByText('$500.00');

        const setBudgetBtn = screen.getAllByRole('button').filter(btn => btn.className === 'exp-btn')[1];
        fireEvent.click(setBudgetBtn);

        expect(screen.getByText('Set your budget for the month:')).toBeInTheDocument();

        const budgetInput = container.querySelector('.budget_input_text');
        fireEvent.change(budgetInput, { target: { value: '800' } });

        const saveBudgetBtn = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveBudgetBtn);

        await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/api/exp/budget'),
            expect.objectContaining({
            budget_amount: 800
            })
        );
        });
    });

    it('should fire confirmation prompts and delete items securely when clicking delete button', async () => {
        const { container } = render(
        <MemoryRouter>
            <ExpenditureTracker />
        </MemoryRouter>
        );

        await screen.findByText('Description: Chicken Rice Splurge');

        const deleteBtn = container.querySelector('.btn-delete-item');
        fireEvent.click(deleteBtn);

        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('delete this expenditure record'));

        await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/api/exp/transaction/11'));
        });
    });

    it('should verify behavior when entering a negative total amount value', async () => {
        const { container } = render(
        <MemoryRouter>
            <ExpenditureTracker />
        </MemoryRouter>
        );

        await screen.findByText('$500.00');

        const addExpenseBtn = container.querySelector('.exp-btn');
        fireEvent.click(addExpenseBtn);

        fireEvent.change(container.querySelector('input[name="description"]'), { target: { value: 'Negative value test' } });
        fireEvent.change(container.querySelector('input[name="total_amount"]'), { target: { value: '-25.50' } });

        const saveButton = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ total_amount: -25.50 })
        );
        });
    });

    it('should compute cross-border currency exchange conversion correctly when base and target profiles differ', async () => {
        const { container } = render(
        <MemoryRouter>
            <ExpenditureTracker />
        </MemoryRouter>
        );

        await screen.findByText('$500.00');

        const addExpenseBtn = container.querySelector('.exp-btn');
        fireEvent.click(addExpenseBtn);

        fireEvent.change(container.querySelector('input[name="description"]'), { target: { value: 'Cross-Border Shopping' } });
        fireEvent.change(container.querySelector('input[name="total_amount"]'), { target: { value: '100' } });
        
        const currencySelect = container.querySelector('select[name="currency"]');
        fireEvent.change(currencySelect, { target: { value: 'USD' } });

        const targetCurrencySelect = container.querySelector('select[name="target_currency"]');
        fireEvent.change(targetCurrencySelect, { target: { value: 'MYR' } });

        await waitFor(() => {
        expect(screen.getByText(/MYR 472.00/)).toBeInTheDocument();
        });
    });

    it('should handle zero-budget configuration profiles gracefully without breaking dashboards layout calculations matrix', async () => {
        // 1. Ensure authentication token exists for this isolated run
        window.localStorage.setItem("token", "dummy-jwt-token-string");
    
        // 2. Mock specific GET routes cleanly
        axios.get.mockImplementation((url) => {
            if (url.includes('/api/exp/transaction/5')) {
                return Promise.resolve({
                data: [
                    { 
                    bill_id: 11, 
                    category: 'Food', 
                    description: 'Chicken Rice Splurge', 
                    total_amount: 10.00, 
                    net_amount: 10.90, 
                    currency: 'SGD', 
                    exchange_rate: 1, 
                    bill_date: '2026-07-15T00:00:00.000Z' 
                    }
                ]
                });
            }
            if (url.includes('/api/exp/budget/5/')) {
                return Promise.resolve({ data: { budget_amount: 0.00 } });
            }
            if (url.includes('open.er-api.com')) {
                return Promise.resolve({
                    data: { rates: { SGD: 1.34, MYR: 4.72, USD: 1.00 } }
                });
            }
            return Promise.resolve({ data: [] });
        });
    
        render(
          <MemoryRouter>
            <ExpenditureTracker />
          </MemoryRouter>
        );
    
        // 3. Wait for the budget card displaying $0.00 to appear
        const zeroDisplays = await screen.findAllByText('$0.00', {}, { timeout: 3000 });
        expect(zeroDisplays.length).toBeGreaterThanOrEqual(1);
    
        // 4. Verify status badge updates accurately when budget is 0 and spending > 0
        const statusBadge = await screen.findByText('Exceeded Budget');
        expect(statusBadge).toBeInTheDocument();
    });

});