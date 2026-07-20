import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import axios from 'axios';
import CommunityGroups from './pages/CommunityGroups'; 

expect.extend(matchers);

// Mock Axios network boundaries
vi.mock('axios');

// Mock jwt-decode to safely bypass encryption checks
vi.mock('jwt-decode', () => ({
  jwtDecode: () => ({ id: 5, username: 'zhuofan41' })
}));

// 🚀 FIXED: Paths updated to './pages/...' so Vitest intercepts the exact import string inside CommunityGroups.jsx
vi.mock('./pages/TopSectionBar', () => ({
  TopSectionBar: () => <div data-testid="top-bar">Top Bar</div>,
}));

vi.mock('./pages/FooterSection', () => ({
  FooterSection: () => <div data-testid="footer-bar">Footer Bar</div>,
}));

vi.mock('./pages/SmartSplitCalculator', () => ({
  default: () => <div data-testid="calculator-modal">Mock Calculator</div>,
}));

vi.mock('emoji-picker-react', () => ({
  default: () => <div data-testid="emoji-picker">Mock Emoji</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  
  // Create a dummy token string so the component triggers validation rules successfully
  window.localStorage.setItem("token", "dummy-jwt-token-string"); 

  // Setup generic fetch targets matching your core hooks loops execution vectors
  axios.get.mockImplementation((url) => {
    // 1. Mock groups list query matching current user ID (5)
    if (url.includes('/api/groups/user/5')) {
      return Promise.resolve({
        data: [
          { group_id: 179, group_name: "JB group 24/06/26", verification_id: "7PKqbeCA" }
        ]
      });
    }
    // 2. Mock chat history message logs query
    if (url.includes('/messages')) {
      return Promise.resolve({
        data: [
          { message_id: 101, sender_id: 6, username: "linchan07", message_text: "Let's split the dinner bill!" },
          { message_id: 102, sender_id: 5, username: "zhuofan41", message_text: "Sure, let me check.", sent_at: new Date() }
        ]
      });
    }
    // 3. Mock group members data queries
    if (url.includes('/members')) {
      return Promise.resolve({
        data: [
          { user_id: 5, username: "zhuofan41", avatar_seed: "default" },
          { user_id: 6, username: "linchan07", avatar_seed: "test-seed" }
        ]
      });
    }

    if (url.includes('/api/bills/ledger/179')) {
        return Promise.resolve({
          data: [
            { share_id: 50, description: "Dinner Split", debtor_name: "zhuofan41", creditor_name: "linchan07", amount_owed: 25.50, target_currency: "SGD", payment_status: "unpaid" }
          ]
        });
    }
    return Promise.resolve({ data: [] });
  });

  axios.post.mockResolvedValue({ status: 201, data: { success: true } });
});

describe('JBSolver Community Groups Apollo Testing Suite', () => {
    
    it('should render sideboards and default placeholder state if no room is selected', async () => {
        render(
        <MemoryRouter>
            <CommunityGroups />
        </MemoryRouter>
        );

        // Verify sideboards layout elements load correctly
        const topBar = await screen.findByTestId('top-bar');
        expect(topBar).toBeInTheDocument();

        const myChatRoomsText = await screen.findByText('My Chat Rooms');
        expect(myChatRoomsText).toBeInTheDocument();

        // Verify groups loop mounted the specific targeted mock group card item
        const groupItem = await screen.findByText('JB group 24/06/26');
        expect(groupItem).toBeInTheDocument();

        // Verify initial empty placeholder state prompts render cleanly
        expect(screen.getByText(/Select a group chat room from the sidebar menu to start messaging!/i)).toBeInTheDocument();
    });

    it('should switch rooms, mount message streams, and type new text payloads successfully', async () => {
        render(
        <MemoryRouter>
            <CommunityGroups />
        </MemoryRouter>
        );

        // Locate the room card item and click it
        const groupItem = await screen.findByText('JB group 24/06/26');
        fireEvent.click(groupItem);

        // Verify chat view panel displays the selected room details
        const chatHeader = await screen.findByText(/Group ID: 179/i);
        expect(chatHeader).toBeInTheDocument();

        // Verify async chat histories render correctly in bubbles
        expect(screen.getByText("Let's split the dinner bill!")).toBeInTheDocument();

        // Locate input bar text container and simulate character typing events
        const inputElement = screen.getByPlaceholderText('Type a message...');
        fireEvent.change(inputElement, { target: { value: 'Automated Vitest payload logs check' } });
        expect(inputElement.value).toBe('Automated Vitest payload logs check');
    });

    it('should invoke message transmission requests cleanly when hitting the send button', async () => {
        render(
        <MemoryRouter>
            <CommunityGroups />
        </MemoryRouter>
        );

        // Select group first to mount chat room input controls
        const groupItem = await screen.findByText('JB group 24/06/26');
        fireEvent.click(groupItem);

        const inputElement = screen.getByPlaceholderText('Type a message...');
        fireEvent.change(inputElement, { target: { value: 'Sending test message text payload' } });

        // Click submit action element trigger button
        const sendButton = screen.getByRole('button', { name: /Send/i });
        fireEvent.click(sendButton);

        // Verify Axios intercepted the outgoing action payload accurately matching backend schema
        await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
            expect.stringContaining('/api/groups/message'),
            expect.objectContaining({
            groupId: 179,
            senderId: 5,
            messageText: 'Sending test message text payload'
            })
        );
        });

        // Input text field should clear back to defaults following successful transaction cycles
        expect(inputElement.value).toBe('');
    });

    it('should open the members list modal popup when clicking the view members link button', async () => {
        // 🚀 Destructure 'container' from the render function
        const { container } = render(
        <MemoryRouter>
            <CommunityGroups />
        </MemoryRouter>
        );

        const groupItem = await screen.findByText('JB group 24/06/26');
        fireEvent.click(groupItem);

        // 🚀 Use querySelector instead of findByClassName
        const settingsBtn = container.querySelector('.settings-btn');
        fireEvent.click(settingsBtn);

        const viewMembersBtn = screen.getByText('View group members');
        fireEvent.click(viewMembersBtn);

        const modalHeading = await screen.findByText('Members of JB group 24/06/26');
        expect(modalHeading).toBeInTheDocument();

        const memberCount = screen.getByText('2 members');
        expect(memberCount).toBeInTheDocument();
    });

    it('should open the Debt Tracking overlay sheet and mount ledger histories', async () => {
        const { container } = render(
        <MemoryRouter>
            <CommunityGroups />
        </MemoryRouter>
        );

        const groupItem = await screen.findByText('JB group 24/06/26');
        fireEvent.click(groupItem);

        const settingsBtn = container.querySelector('.settings-btn');
        fireEvent.click(settingsBtn);

        const debtTrackingBtn = screen.getByText('Debt Tracking');
        fireEvent.click(debtTrackingBtn);

        expect(screen.getByRole('heading', { name: 'Debt Tracking' })).toBeInTheDocument();

        const ledgerItemDescription = await screen.findByText('Dinner Split');
        expect(ledgerItemDescription).toBeInTheDocument();
        expect(screen.getByText('SGD 25.50')).toBeInTheDocument();
    });

    it('should toggle the Smart Split Calculator sub-module overlay safely', async () => {
        const { container } = render(
        <MemoryRouter>
            <CommunityGroups />
        </MemoryRouter>
        );

        const groupItem = await screen.findByText('JB group 24/06/26');
        fireEvent.click(groupItem);

        const calculatorIconBtn = container.querySelector('.calculator-btn');
        fireEvent.click(calculatorIconBtn);

        const mockCalculatorPlaceholder = await screen.findByTestId('calculator-modal');
        expect(mockCalculatorPlaceholder).toBeInTheDocument();
    });

});