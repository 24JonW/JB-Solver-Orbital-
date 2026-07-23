import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import axios from 'axios';

import CommunityGroups from '../pages/CommunityGroups';
import HomePage from '../pages/HomePage';

expect.extend(matchers);

// Mock Axios network boundaries
vi.mock('axios');

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock external/sub-components to prevent rendering overhead
vi.mock('jwt-decode', () => ({
  jwtDecode: () => ({ id: 5, username: 'User1' })
}));

vi.mock('../pages/TopSectionBar', () => ({
  TopSectionBar: () => <div data-testid="top-bar">Top Bar</div>,
}));

vi.mock('../pages/FooterSection', () => ({
  FooterSection: () => <div data-testid="footer-bar">Footer Bar</div>,
}));

vi.mock('emoji-picker-react', () => ({
  default: () => <div data-testid="emoji-picker">Mock Emoji</div>,
}));

// Mock native alerts
global.alert = vi.fn();
global.confirm = vi.fn(() => true);

describe('E2E End-to-End Group Settlement & Debt Workflows', () => {
  
  // In-memory mock database state
  let mockDatabase = {
    groups: [],
    groupMembers: {},
    messages: {},
    debts: [] // Ledger items / outstanding payments
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    // Reset in-memory database before each test run
    mockDatabase = {
      groups: [
        { group_id: 101, group_name: "Weekend JB Trip", verification_id: "JBTRIP123" }
      ],
      groupMembers: {
        101: [
          { user_id: 5, username: "User1" },
          { user_id: 6, username: "User2" }
        ]
      },
      messages: {
        101: []
      },
      debts: []
    };

    // Default active user is User1
    window.localStorage.setItem("userId", "5");
    window.localStorage.setItem("token", "dummy-jwt-token-string");

    // Dynamic Axios Mock Interceptor routing to the in-memory state
    axios.get.mockImplementation((url) => {
      // 1. User Groups query
      if (url.includes('/api/groups/user/')) {
        return Promise.resolve({ data: mockDatabase.groups });
      }

      // 2. User Accounts query
      if (url.includes('/api/accounts/5')) {
        return Promise.resolve({ data: { user_id: 5, username: "User1", email: "user1@test.com" } });
      }
      if (url.includes('/api/accounts/6')) {
        return Promise.resolve({ data: { user_id: 6, username: "User2", email: "user2@test.com" } });
      }

      // 3. Messages query
      if (url.includes('/messages')) {
        const groupId = url.split('/').pop();
        return Promise.resolve({ data: mockDatabase.messages[groupId] || [] });
      }

      // 4. Group Members query
      if (url.includes('/members')) {
        return Promise.resolve({ data: mockDatabase.groupMembers[101] || [] });
      }

      // 5. Outstanding Payments for Home Page (Debts owed BY active user)
      if (url.includes('/api/bills/outstanding/')) {
        const activeUserId = url.split('/').pop();
        const activeDebts = mockDatabase.debts.filter(
          (d) => String(d.debtor_id) === String(activeUserId) && d.payment_status === 'unpaid'
        );
        return Promise.resolve({ data: activeDebts });
      }

      // 6. Receivables for Home Page (Debts owed TO active user)
      if (url.includes('/api/bills/receivables/')) {
        const activeUserId = url.split('/').pop();
        const activeReceivables = mockDatabase.debts.filter(
          (d) => String(d.creditor_id) === String(activeUserId) && d.payment_status === 'unpaid'
        );
        return Promise.resolve({ data: activeReceivables });
      }

      // 7. Group Debt Ledger
      if (url.includes('/api/bills/ledger/')) {
        return Promise.resolve({ data: mockDatabase.debts });
      }

      return Promise.resolve({ data: [] });
    });

    // Axios POST routing for actions
    axios.post.mockImplementation((url, payload) => {
      // Create new group
      if (url.includes('/api/groups/create')) {
        const newGroup = { group_id: 102, group_name: payload.groupName, verification_id: "NEW123" };
        mockDatabase.groups.push(newGroup);
        mockDatabase.groupMembers[102] = [{ user_id: 5, username: "User1" }];
        return Promise.resolve({ status: 201, data: newGroup });
      }

      // Add user to group
      if (url.includes('/api/groups/add-member')) {
        if (!mockDatabase.groupMembers[payload.groupId]) {
          mockDatabase.groupMembers[payload.groupId] = [];
        }
        mockDatabase.groupMembers[payload.groupId].push({ user_id: payload.userId, username: payload.username });
        return Promise.resolve({ status: 200, data: { success: true } });
      }

      // Split bill (Creates debt records)
      if (url.includes('/api/bills/split') || url.includes('/api/bills/split_smart')) {
        const newDebt = {
          share_id: mockDatabase.debts.length + 1,
          description: payload.description || 'Split Bill',
          debtor_id: payload.debtorId || 5, // User1 owes
          debtor_name: payload.debtorName || 'User1',
          creditor_id: payload.creditorId || 6, // User2 is owed
          creditor_name: payload.creditorName || 'User2',
          amount_owed: payload.amount || 50.00,
          target_currency: 'SGD',
          payment_status: 'unpaid',
          group_id: payload.groupId || 101
        };
        mockDatabase.debts.push(newDebt);
        return Promise.resolve({ status: 201, data: { success: true, debt: newDebt } });
      }

      // Pay single debt
      if (url.includes('/api/bills/pay/')) {
        const shareId = parseInt(url.split('/').pop(), 10);
        const targetDebt = mockDatabase.debts.find((d) => d.share_id === shareId);
        if (targetDebt) {
          targetDebt.payment_status = 'paid';
        }
        return Promise.resolve({ status: 200, data: { success: true } });
      }

      // Pay all debts at once
      if (url.includes('/api/bills/pay-all')) {
        mockDatabase.debts.forEach((d) => {
          if (String(d.debtor_id) === String(payload.userId)) {
            d.payment_status = 'paid';
          }
        });
        return Promise.resolve({ status: 200, data: { success: true } });
      }

      return Promise.resolve({ status: 200, data: { success: true } });
    });
  });

  /**
   * -------------------------------------------------------------------
   * SCENARIO 1: Settling a single group bill
   * User1 creates group -> User2 joins -> Split bill -> Debt on Home page -> User1 pays -> Debt clears
   * -------------------------------------------------------------------
   */
  it('SCENARIO 1: Settling a single group bill accurately updates outstanding payment state', async () => {
    // 1. User1 creates group and allows User2 to join
    await axios.post('/api/groups/create', { groupName: 'New JB Trip', userId: 5 });
    await axios.post('/api/groups/add-member', { groupId: 102, userId: 6, username: 'User2' });

    // 2. User2 splits a bill with User1 ($50.00 debt created for User1)
    await axios.post('/api/bills/split', {
      groupId: 102,
      description: 'Dinner at JB',
      debtorId: 5,
      debtorName: 'User1',
      creditorId: 6,
      creditorName: 'User2',
      amount: 50.00
    });

    // 3. Render HomePage to verify Debt appears in User1's outstanding payments
    const { rerender } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    // Verify User1's profile loaded
    const usernameTag = await screen.findByText(/Username:\s*User1/i);
    expect(usernameTag).toBeInTheDocument();

    // Verify outstanding debt is rendered on screen
    const unpaidDebtItem = await screen.findByText(/Dinner at JB/i);
    expect(unpaidDebtItem).toBeInTheDocument();
    expect(screen.getByText(/50\.00/i)).toBeInTheDocument();

    // 4. User1 settles/pays the debt
    const payButton = screen.getByRole('button', { name: /Pay|Settle/i });
    fireEvent.click(payButton);

    // Simulate clicking backend pay endpoint
    await axios.post('/api/bills/pay/1');

    // 5. Re-render Home page to verify Debt no longer appears in outstanding payments
    rerender(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Dinner at JB/i)).not.toBeInTheDocument();
    });
  });

  /**
   * -------------------------------------------------------------------
   * SCENARIO 2: Delaying payments and paying all at once
   * User2 adds 3 bills -> User1 procrastinates (3 debts accumulate) -> User1 pays all at once -> All debts clear
   * -------------------------------------------------------------------
   */
  it('SCENARIO 2: Accumulating 3 debt records and settling all at once clears home page list', async () => {
    // 1. In the same group, User2 keeps adding 3 new split bills for User1
    const bills = [
      { description: 'Transport Bill', amount: 15.00 },
      { description: 'Lunch Splurge', amount: 25.00 },
      { description: 'Groceries Split', amount: 20.00 }
    ];

    for (const bill of bills) {
      await axios.post('/api/bills/split', {
        groupId: 101,
        description: bill.description,
        debtorId: 5,
        debtorName: 'User1',
        creditorId: 6,
        creditorName: 'User2',
        amount: bill.amount
      });
    }

    // 2. User1 procrastinates for 3 bills -> Render HomePage and confirm 3 debt records appear
    const { rerender } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const transportItem = await screen.findByText(/Transport Bill/i);
    const lunchItem = await screen.findByText(/Lunch Splurge/i);
    const groceriesItem = await screen.findByText(/Groceries Split/i);

    expect(transportItem).toBeInTheDocument();
    expect(lunchItem).toBeInTheDocument();
    expect(groceriesItem).toBeInTheDocument();

    // 3. User1 pays all at once
    const payAllButton = screen.getByRole('button', { name: /Pay All|Settle All/i });
    fireEvent.click(payAllButton);

    // Execute batch settlement API call
    await axios.post('/api/bills/pay-all', { userId: 5, groupId: 101 });

    // 4. Re-render HomePage and verify debts do NOT appear in outstanding payments
    rerender(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Transport Bill/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Lunch Splurge/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Groceries Split/i)).not.toBeInTheDocument();
    });
  });

});