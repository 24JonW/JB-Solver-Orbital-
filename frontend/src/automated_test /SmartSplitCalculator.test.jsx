import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import axios from 'axios';
import SmartSplitCalculator from '../pages/SmartSplitCalculator'; // Verify matching directory file paths

expect.extend(matchers);

// Mock Axios layer
vi.mock('axios');

// Mock window alert metrics since component invokes native prompt overlays
global.alert = vi.fn();

describe('Smart Split Calculator automated testing ', () => {
  // Setup standard faked Prop data vectors
    const mockMembers = [
        { user_id: 5, username: 'zhuofan41' },
        { user_id: 6, username: 'linchan07' }
    ];

    const mockCurrentUser = { user_id: 5, username: 'zhuofan41' };
    const mockSelectedGroup = { group_id: 179, group_name: 'JB group 24/06/26' };
    
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock the currency exchange rate API query hook payload
        axios.get.mockImplementation((url) => {
        if (url.includes('open.er-api.com')) {
            return Promise.resolve({
            data: {
                rates: {
                SGD: 1.34,
                MYR: 4.72,
                USD: 1.00
                }
            }
            });
        }
        return Promise.resolve({ data: {} });
        });

        //  Mock the bill calculation validation endpoint
        axios.post.mockImplementation((url) => {
        if (url.includes('/api/bills/split_smart')) {
            return Promise.resolve({
            data: {
                transactions: [
                { debtorId: 6, creditorId: 5, amount: 46.86 }
                ]
            }
            });
        }
        if (url.includes('/api/groups/message')) {
            return Promise.resolve({ status: 201, data: { success: true } });
        }
        return Promise.resolve({ data: {} });
        });
    });

    it('should render nothing when show property evaluated to false', () => {
        const { container } = render(
        <SmartSplitCalculator 
            show={false}
            onClose={mockOnClose}
            selectedGroup={mockSelectedGroup}
            currentUser={mockCurrentUser}
            groupMembers={mockMembers}
        />
        );
        expect(container.firstChild).toBeNull();
    });

    it('should load currencies list and balance base subtotal values cleanly inside DOM layout', async () => {
        render(
            <SmartSplitCalculator 
                show={true}
                onClose={mockOnClose}
                selectedGroup={mockSelectedGroup}
                currentUser={mockCurrentUser}
                groupMembers={mockMembers}
            />
        );

        // Verify modal elements mount properly
        expect(screen.getByText('Smart Bill Splitter')).toBeInTheDocument();
        
        // Check if group members list handles matching profile arrays fields correctly
        expect(screen.getByText('zhuofan41 (You)')).toBeInTheDocument();
        expect(screen.getByText('linchan07')).toBeInTheDocument();

        // Wait for the currency selector dropdown payload tracking loop to populate fields asynchronously
        await waitFor(() => {
            const myrOptions = screen.getAllByRole('option', { name: 'MYR' });
            expect(myrOptions.length).toBe(2); // Confirms 'MYR' rendered successfully in both selectors
            expect(myrOptions[0]).toBeInTheDocument();
        });
    });

    it('should process user typing events, evaluate currency math formulas, and calculate a dryRun preview breakdown', async () => {
        // 🚀 Destructure container here
        const { container } = render(
        <SmartSplitCalculator 
            show={true}
            onClose={mockOnClose}
            selectedGroup={mockSelectedGroup}
            currentUser={mockCurrentUser}
            groupMembers={mockMembers}
        />
        );

        // Fill bill description form data fields lines string ranges
        const descInput = screen.getByPlaceholderText('Your group expenditure...');
        fireEvent.change(descInput, { target: { value: 'Dinner at Oriental Kopi' } });

        // Input numerical funds inside "Who Paid?" field block (zhuofan41 pays 100 SGD)
        const numericalInputs = screen.getAllByPlaceholderText('0.00');
        fireEvent.change(numericalInputs[0], { target: { value: '100' } });

        // 🚀 FIXED: Grab the exact button via its CSS class name selector
        const calculateBtn = container.querySelector('.smartSplitButton');
        fireEvent.click(calculateBtn);

        // Verify system invoked Axios endpoint with matching smart payload configuration
        await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/api/bills/split_smart'),
            expect.objectContaining({
            groupId: 179,
            description: 'Dinner at Oriental Kopi',
            dryRun: true
            })
        );
        });

        // Check if preview dashboard text box prints calculations values logs
        const summaryHeader = await screen.findByText('Settlement Preview');
        expect(summaryHeader).toBeInTheDocument();
        expect(screen.getByText(/linchan07 owes zhuofan41/i)).toBeInTheDocument();
    });

    it('should prompt an warning message overlay alert parameter if saving summary blocks before running calculations preview steps', async () => {
        render(
        <SmartSplitCalculator 
            show={true}
            onClose={mockOnClose}
            selectedGroup={mockSelectedGroup}
            currentUser={mockCurrentUser}
            groupMembers={mockMembers}
        />
        );

        // Locate dispatch icon buttons wrapper bounds index indicators
        const sendBtn = screen.getAllByRole('button')[2]; // Targeting second layout structural link action icon button
        fireEvent.click(sendBtn);

        expect(global.alert).toHaveBeenCalledWith('Please calculate the bill preview first before saving.');
    });

    it('should alert an error and block submission if description field input is completely blank', async () => {
        const { container } = render(
          <SmartSplitCalculator 
            show={true}
            onClose={mockOnClose}
            selectedGroup={mockSelectedGroup}
            currentUser={mockCurrentUser}
            groupMembers={mockMembers}
          />
        );
    
        // Description is left empty by default. Add payment numerical data to "Who Paid"
        const numericalInputs = screen.getAllByPlaceholderText('0.00');
        fireEvent.change(numericalInputs[0], { target: { value: '50' } });
    
        // Click the calculate action button
        const calculateBtn = container.querySelector('.smartSplitButton');
        fireEvent.click(calculateBtn);
    
        // Verify that it triggers the validation warning and blocks the API call
        expect(global.alert).toHaveBeenCalledWith('Please enter a description.');
        expect(axios.post).not.toHaveBeenCalled();
    });
    
    it('should alert an error and block submission if no members have entered any payment amount', async () => {
        const { container } = render(
          <SmartSplitCalculator 
            show={true}
            onClose={mockOnClose}
            selectedGroup={mockSelectedGroup}
            currentUser={mockCurrentUser}
            groupMembers={mockMembers}
          />
        );
    
        // 1. Enter a valid description but leave all payment amounts at 0
        const descInput = screen.getByPlaceholderText('Your group expenditure...');
        fireEvent.change(descInput, { target: { value: 'Movie Night' } });
    
        // 2. Click calculate button
        const calculateBtn = container.querySelector('.smartSplitButton');
        fireEvent.click(calculateBtn);
    
        // 3. Verify it catches the zero-payer edge case safely
        expect(global.alert).toHaveBeenCalledWith('At least one payer is required.');
        expect(axios.post).not.toHaveBeenCalled();
    });
    
    it('should alert an error and prevent calculation when a custom split method does not balance out accurately', async () => {
        const { container } = render(
          <SmartSplitCalculator 
            show={true}
            onClose={mockOnClose}
            selectedGroup={mockSelectedGroup}
            currentUser={mockCurrentUser}
            groupMembers={mockMembers}
          />
        );
    
        // Populate basic validation requirements
        const descInput = screen.getByPlaceholderText('Your group expenditure...');
        fireEvent.change(descInput, { target: { value: 'Team Dinner Platter' } });
    
        // Change the dropdown split method selector to "custom"
        const splitSelector = container.querySelector('.splitMethodOption');
        fireEvent.change(splitSelector, { target: { value: 'custom' } });
    
        // Enter a Total Paid amount of 100
        const paymentInputs = screen.getAllByPlaceholderText('0.00');
        fireEvent.change(paymentInputs[0], { target: { value: '100' } }); // Payer 1 paid 100
    
        // Intentionally make individual items unbalanced (e.g., individual item costs add up to 40 instead of 100)
        // The inputs list dynamically maps out below the conditional rendering blocks
        const proportionalInputs = container.querySelectorAll('.proportionalInput');
        fireEvent.change(proportionalInputs[0], { target: { value: '20' } }); // Member 1 consumed 20
        fireEvent.change(proportionalInputs[1], { target: { value: '20' } }); // Member 2 consumed 20
        // Shared cost input left at 0, making the expected calculation total 40. (Unbalanced vs 100 Paid)
    
        // Fire click event
        const calculateBtn = container.querySelector('.smartSplitButton');
        fireEvent.click(calculateBtn);
    
        // Verify mathematically unbalanced splits are blocked instantly from routing to the database
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('The bill does not balance.'));
        expect(axios.post).not.toHaveBeenCalled();
    });

});