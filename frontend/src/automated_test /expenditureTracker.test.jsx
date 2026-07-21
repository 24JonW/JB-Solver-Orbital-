import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import axios from 'axios';
import ExpenditureTracker from '../pages/ExpenditureTracker'; // Verify your exact path relative to automated_test directory

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
            { bill_id: 11, category: 'Food', description: 'Chicken Rice', total_amount: 10.00, net_amount: 10.90, currency: 'SGD', exchange_rate: 1, bill_date: '2026-07-15T00:00:00.000Z' }
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

        // Verify sub-layout containers exist
        expect(screen.getByTestId('top-bar')).toBeInTheDocument();
        
        // Check asynchronous mathematical budget fields map correctly
        const budgetCardValue = await screen.findByText('$500.00');
        expect(budgetCardValue).toBeInTheDocument();

        // Verify aggregate month spending metrics calculation values flow ($10.90 from mock net_amount)
        expect(screen.getByText('$10.90')).toBeInTheDocument();

        // Verify ledger table lists parsed transactional entries
        expect(screen.getByText('Description: Chicken Rice')).toBeInTheDocument();
    });

    it('should launch the subtotal builder modal, calculate internal complex taxes math rules, and submit data successfully', async () => {
        const { container } = render(
            <MemoryRouter>
                <ExpenditureTracker />
            </MemoryRouter>
        );

        // Wait for baseline page content setup
        await screen.findByText('$500.00');

        // Click 'Add Expenditure' shortcut action button via icon container wrapper mapping
        const addExpenseBtn = container.querySelector('.exp-btn');
        fireEvent.click(addExpenseBtn);

        // Verify form overlay mounts
        expect(screen.getByText('Add Personal Expenditure')).toBeInTheDocument();

        // Populate data details inputs fields fields
        fireEvent.change(container.querySelector('input[name="description"]'), { target: { value: 'Grab ride home' } });
        fireEvent.change(container.querySelector('input[name="total_amount"]'), { target: { value: '20' } });
        fireEvent.change(container.querySelector('.GSTInput'), { target: { value: '9' } }); // 9% GST
        fireEvent.change(container.querySelector('.addition_TaxLabel + input'), { target: { value: '10' } }); // 10% Service Tax

        // Check calculated derived text updates: base 20 * (1 + 0.09 + 0.10) = 23.80
        const totalAmountDisplays = screen.getAllByText(/SGD 23.80/);
        expect(totalAmountDisplays.length).toBeGreaterThanOrEqual(1);
        expect(totalAmountDisplays[0]).toBeInTheDocument();

        // Fire form submission event trigger click
        const saveButton = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveButton);

        // Verify Axios intercepted outgoing post payload data footprints cleanly matching backend schema
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

        // Click the second icon launcher button (Set Budget action control trigger element mapping)
        const setBudgetBtn = screen.getAllByRole('button').filter(btn => btn.className === 'exp-btn')[1];
        fireEvent.click(setBudgetBtn);

        // Verify modal inputs display
        expect(screen.getByText('Set your budget for the month:')).toBeInTheDocument();

        const budgetInput = container.querySelector('.budget_input_text');
        fireEvent.change(budgetInput, { target: { value: '800' } });

        // Submit changes
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

        // Wait for ledger to render mock items asynchronously
        await screen.findByText('Description: Chicken Rice');

        // Using querySelector to safely fetch the class element 
        const deleteBtn = container.querySelector('.btn-delete-item');
        fireEvent.click(deleteBtn);

        // Confirms interaction framework checked window.confirm boundaries loops rules
        expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('delete this expenditure record'));

        await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining('/api/exp/transaction/11'));
        });
    });

    it('should alert an error and block submission when entering a negative total amount value', async () => {
        const { container } = render(
        <MemoryRouter>
            <ExpenditureTracker />
        </MemoryRouter>
        );

        await screen.findByText('$500.00');

        // Open Modal
        const addExpenseBtn = container.querySelector('.exp-btn');
        fireEvent.click(addExpenseBtn);

        // Populate valid description but an invalid negative total amount field
        fireEvent.change(container.querySelector('input[name="description"]'), { target: { value: 'Negative value leak test' } });
        fireEvent.change(container.querySelector('input[name="total_amount"]'), { target: { value: '-25.50' } });

        // Fire save submission form
        const saveButton = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveButton);

        // Assert that the native form inputs validation constraints or your state handlers safely catch this
        // (If using default HTML 'required' or custom handlers, this ensures bad values don't pass blindly to Axios)
        await waitFor(() => {
        // It should either block the api call or normalize the input based on your validation architecture
        expect(axios.post).not.toHaveBeenCalledWith(
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

        // Open Modal
        const addExpenseBtn = container.querySelector('.exp-btn');
        fireEvent.click(addExpenseBtn);

        // Select alternative base currency: USD ($100) and convert to target: MYR (4.72 rate)
        fireEvent.change(container.querySelector('input[name="description"]'), { target: { value: 'Cross-Border Shopping' } });
        fireEvent.change(container.querySelector('input[name="total_amount"]'), { target: { value: '100' } });
        
        // Select USD as Base
        const currencySelect = container.querySelector('select[name="currency"]');
        fireEvent.change(currencySelect, { target: { value: 'USD' } });

        // Select MYR as Target via the target currency container selector handler block
        const targetCurrencySelect = container.querySelector('select[name="target_currency"]');
        fireEvent.change(targetCurrencySelect, { target: { value: 'MYR' } });

        // Verify mathematical formula calculations engine updating view fields layout dynamically
        // Conversion Formula: (100 USD Base Amount) * (4.72 MYR Rate / 1.00 USD Base Rate) = 472.00 MYR
        await waitFor(() => {
        expect(screen.getByText(/MYR 472.00/)).toBeInTheDocument();
        });
    });

    it('should handle zero-budget configuration profiles gracefully without breaking dashboards layout calculations matrix', async () => {
        // Force backend endpoint query implementation to return zero budget allocation metrics values
        axios.get.mockImplementationOnce((url) => {
        if (url.includes('/api/exp/budget/5/')) {
            return Promise.resolve({ data: { budget_amount: 0.00 } });
        }
        return Promise.resolve({ data: [] });
        });

        render(
        <MemoryRouter>
            <ExpenditureTracker />
        </MemoryRouter>
        );

        // Verify zero baseline configurations update UI cleanly without falling into NaN / Infinite loop calculations bugs
        const zeroBudgetCard = await screen.findByText('$0.00');
        expect(zeroBudgetCard).toBeInTheDocument();

        // Verify budget remaining handles the negative flow cleanly
        expect(screen.getByText('Exceeded Budget')).toBeInTheDocument();
        expect(screen.getByText('0% used')).toBeInTheDocument();
    });
});