import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react'; 
import axios from 'axios'; 
import { jwtDecode } from 'jwt-decode'; 

import '../App.css'; 
import '../ExTracker.css'; 

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

import { TopSectionBar } from './TopSectionBar'; 

// Register ChartJS sub-modules securely
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
  },
};

const getDynamicBarData = (ledgerItems) => {
  const categoryTotals = {};  
  ledgerItems.forEach(item => {
    const category = item.category || "Others"; 
    const amount = parseFloat(item.net_amount || item.total_amount) || 0; 
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;  
  });
  return {
    labels: Object.keys(categoryTotals), 
    datasets: [
      {
        label: "Expenses by Category ($)", 
        data: Object.values(categoryTotals), 
        backgroundColor: 'rgba(237, 182, 1, 0.6)', 
        borderColor: 'rgba(237, 182, 1, 1)', 
        borderWidth: 1, 
      }
    ]
  };
};

const getDynamicLineData = (ledgerItems) => {
    const dateTotals = {};

    ledgerItems.forEach(item => {
        if (!item.bill_date) return;

        const normalizedDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Singapore",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date(item.bill_date)); 

        const amount = Number(item.net_amount || item.total_amount) || 0;

        dateTotals[normalizedDate] =
            (dateTotals[normalizedDate] || 0) + amount;
    });

    const sortedDates = Object.keys(dateTotals).sort();

    return {
        labels: sortedDates.map(date => {
            const [year, month, day] = date.split("-");
            return `${day}/${month}`;
        }),
        datasets: [
            {
                label: "Daily Spending Trend ($)",
                data: sortedDates.map(date => dateTotals[date]),
                borderColor: "#edb601",
                backgroundColor: "#edb601",
                fill: false,
                tension: 0.2,
            },
        ],
    };
};

function ExpenditureTracker() {
  const navigate = useNavigate(); 
  const [ ledger, setLedger ] = useState([]); 
  const [currentUser, setCurrentUser] = useState(null); 

  // const API_EXP_URL = 'http://localhost:5001/api/exp';
  const API_EXP_URL = 'https://jb-solver-orbital.onrender.com/api/exp';
  
  const [isModalOpen, setIsModalOpen ] = useState(false); 
  const [formData, setFormData] = useState({
    description: '', 
    category: 'Food', 
    bill_date: new Date().toISOString().split('T')[0], 
    total_amount: '', 
    currency: 'SGD'
  }); 

  const [ isBudgetModalOpen, setIsBudgetModalOpen ] = useState(false); 
  const [ budget, setBudget ] = useState(0); 
  const [ budgetInput, setBudgetInput ] = useState(""); 
  const [ totalAmountMonth, setTotalAmountMonth ] = useState(0); 
  const [ totalAmountPrevMonth, setTotalAmountPrevMonth ] = useState(0); 

  // Helper function to calculate current month spend given an items array
  const calculateCurrentMonthSpend = (items) => {
    const now = new Date(); 
    const currentMonth = now.getMonth(); 
    const currentYear = now.getFullYear(); 
    return items.reduce((total, item) => {
      const billDate = new Date(item.bill_date); 
      if (billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear) {
        return total + Number(item.net_amount || item.total_amount); 
      }
      return total; 
    }, 0);
  };

  const calculatePrevMonthSpend = (items) => {
    const now = new Date(); 
    const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); 
    const prevMonth = targetDate.getMonth(); 
    const prevMonthYear = targetDate.getFullYear(); 
    return items.reduce((total, item) => {
      const billDate = new Date(item.bill_date); 
      if (billDate.getMonth() === prevMonth && billDate.getFullYear() === prevMonthYear) {
        return total + Number(item.net_amount || item.total_amount); 
      }
      return total; 
    }, 0); 

  }; 

  const handleInputChange = (e) => {
    const { name, value } = e.target; 
    setFormData(prev => ({...prev, [name]: value})); 
  }; 

  const handleFormSubmit = (e) => {
    e.preventDefault(); 
    if (!currentUser) return; 
    const newTransaction = {
      payer_user_id: currentUser.user_id, 
      description: formData.description, 
      category: formData.category, 
      bill_date: formData.bill_date, 
      total_amount: parseFloat(formData.total_amount) || 0, 
      net_amount: parseFloat(formData.total_amount || 0), 
      currency: formData.currency, 
      group_id: null
    }

    axios.post(`${API_EXP_URL}/transaction`, newTransaction)
         .then(res => {
            const savedTransaction = res.data.transaction || res.data; 
            
            // Generate the exact updated ledger array directly
            const updatedLedger = [savedTransaction, ...ledger];
            setLedger(updatedLedger); 

            setIsModalOpen(false); 
            setFormData({
              description: '', 
              category: 'Food', 
              bill_date: new Date().toISOString().split('T')[0],
              total_amount: '', 
              currency: 'SGD'
            });

            // Calculate using the updated array so values refresh instantly
            setTotalAmountMonth(calculateCurrentMonthSpend(updatedLedger)); 
            setTotalAmountPrevMonth(calculatePrevMonthSpend(updatedLedger));
         })
         .catch(err => console.error('Error creating expenditure record:', err)); 
  }

  const handleDelete = (billId) => {
    const confirmed = window.confirm('Are you sure you want to delete this expenditure record?');
    if (!confirmed) return; 

    axios.delete(`${API_EXP_URL}/transaction/${billId}`)
        .then((res) => {
          alert('Transaction deleted successfully!'); 
          
          // Generate the filtered array directly
          const updatedLedger = ledger.filter(item => item.bill_id !== billId);
          setLedger(updatedLedger);

          // Calculate using the remaining items so cards refresh instantly
          setTotalAmountMonth(calculateCurrentMonthSpend(updatedLedger));
          setTotalAmountPrevMonth(calculatePrevMonthSpend(updatedLedger)); 
        })
        .catch(err => {
          console.error('Error removing transaction record:', err);
          alert('Failed to delete transaction record'); 
        }); 
  };

  useEffect(()=> {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/'); 
      return;
    }
    try {
      const decoded = jwtDecode(token);
      setCurrentUser({
        user_id: decoded.id, 
        username: decoded.username
      });
    } catch (err) {
      console.error("Invalid authentication token:", err); 
      localStorage.removeItem('token'); 
      navigate('/');
    }
  }, [navigate]); 

  useEffect(() => {
    if (!currentUser) return; 
    axios.get(`${API_EXP_URL}/transaction/${currentUser.user_id}`)
    .then(res => {
      console.log(res.data);
      if (Array.isArray(res.data)) {
        setLedger(res.data);
        setTotalAmountMonth(calculateCurrentMonthSpend(res.data));
        setTotalAmountPrevMonth(calculatePrevMonthSpend(res.data));
      } 
    })
    .catch(err => console.error(err)); 
  }, [currentUser]);

  useEffect(() => {
    const savedBudget = localStorage.getItem("budget");
    if (savedBudget) {
      setBudget(Number(savedBudget));
    }
  }, [])

  const handleBudgetInput = (e) => {
    e.preventDefault(); 
    const value = Number(budgetInput); 
    setBudget(value); 
    localStorage.setItem("budget", value); 
    setIsBudgetModalOpen(false); 
  }

  const budgetUsedPercent = budget > 0 ? (totalAmountMonth / budget) * 100 : 0; 
  let momVariancePercent = 0; 
  if (totalAmountPrevMonth > 0) {
    momVariancePercent = ((totalAmountMonth - totalAmountPrevMonth) / totalAmountPrevMonth) * 100; 
  } else if (totalAmountMonth > 0) {
    momVariancePercent = 100; 
  }

  const budgetRemainingPercent = budget > 0 ? (((budget - totalAmountMonth) / budget) * 100) : 0;

  return (
    <div className="homepage-container">
      <TopSectionBar/>
    
      <div className='home-body-ex'>
        <div className='card' style={{gridArea: 'box-1'}}>
          <div className="number" >${budget.toFixed(2)}</div>
          <div className="card-description">Budget this month</div>
          
        </div>
        <div className='card' style={{gridArea: 'box-2'}}>
          <div className="number">${totalAmountMonth.toFixed(2)}</div>
          <div className="card-description">Expenditure this month</div> 

          <div className="percentage-description" style={{ 
            fontSize: '0.85rem', 
            fontWeight: 'bold', 
            color: budgetUsedPercent > 100 ? '#ff4d4d' : '#2ecc71',
            marginTop: '4px' 
          }}>
            {budgetUsedPercent > 0 ? `${budgetUsedPercent.toFixed(1)}% of budget used` : '0% used'}
          </div>
        </div>
        <div className='card' style={{gridArea: 'box-3'}}>
          <div className="number">${totalAmountPrevMonth.toFixed(2)}</div>
          <div className="card-description">Comparison with prev month</div>
          <div className="percentage-description" style={{ 
            fontSize: '0.85rem', 
            fontWeight: 'bold', 
            color: momVariancePercent > 0 ? '#ff4d4d' : '#2ecc71', // Spending up is bad (red), down is good (green)
            marginTop: '4px' 
          }}>
            {momVariancePercent >= 0 ? '▲ ' : '▼ '}
            {Math.abs(momVariancePercent).toFixed(1)}% 
          </div>

        </div>
        <div className='card' style={{gridArea: 'box-4'}}>
          <div className="number">${(budget - totalAmountMonth).toFixed(2)}</div>
          <div className="card-description">Remaining Budget</div>
          <div className="percentage-description" style={{ 
            fontSize: '0.85rem', 
            fontWeight: 'bold', 
            color: (budget - totalAmountMonth) >= 0 ? '#2ecc71' : '#ff4d4d',
            marginTop: '4px' 
          }}>
            {budgetRemainingPercent.toFixed(1)}% left
          </div>
        </div>
        
        <div className="card" style={{ gridArea: "box-5", minHeight: '320px', padding: '15px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Spending Trend</h3>
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
              {ledger.length === 0 ? (
                <p>No transactions found.</p>
              ) : (
                <Line data={getDynamicLineData(ledger)} options={chartOptions} />
              )}
            </div>
        </div>

        <div className='card' style={{ gridArea: 'box-6', minHeight: '320px', padding: '15px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Category Breakdown</h3> 
            <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
              {ledger.length === 0 ? (
                <p>No transactions found.</p>
              ) : (
                <Bar data={getDynamicBarData(ledger)} options={chartOptions} />
              )}
            </div>
        </div>

        <div className='card' style={{gridArea: 'box-7'}}>
            <h3>Transaction History</h3>
            <div className="history-card">
              {ledger.length === 0 ? (
                <p>No transactions found.</p>
              ) : (
                <div className='transaction-list'>
                  {ledger.map((item, index) => (
                    <div key={index} className='transaction-row'>
                      <p>Category: {item.category}</p>
                      <p>Description: {item.description} </p>
                      <p>Currency: {item.currency}</p>
                      <p>{item.currency} {item.net_amount}</p>
                      <p>{new Date(item.bill_date).toLocaleDateString()}</p>
                      <button onClick={() => handleDelete(item.bill_id)}
                              className='btn-delete-item'>Delete</button>
                      <hr/>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button className="exp-btn" onClick={() => setIsModalOpen(true)}>Add new expenditure</button>
            <button className="budget-btn" onClick={() => {
              setIsBudgetModalOpen(true); 
              setBudgetInput(budget);
            }}>
              Set Budget
            </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add Personal Expenditure</h3>
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label>Description:</label>
                <input type="text" name="description" value={formData.description} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Category:</label>
                <select name="category" value={formData.category} onChange={handleInputChange}>
                  <option value="Food">Food</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Transport">Transport</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div className="form-group">
                <label>Bill Date:</label>
                <input type="date" name="bill_date" value={formData.bill_date} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Total Amount:</label>
                <input type="number" step="0.01" name="total_amount" value={formData.total_amount} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Currency:</label>
                <select name="currency" value={formData.currency} onChange={handleInputChange}>
                  <option value="SGD">SGD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MYR">MYR</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBudgetModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
                <form onSubmit={handleBudgetInput}>
                  <input type="number" name="budget" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} />
                  <button type='button' className='btn-cancel' onClick={() => setIsBudgetModalOpen(false)}>Cancel</button>
                  <button type='submit' className='btn-submit'>Save</button>
                </form>
            </div>
          </div>
      )}

      <div className='footer'>
        <button className='btn-logout' onClick={() => navigate('/')}>Log Out</button>
      </div>
    </div>
  );
}

export default ExpenditureTracker;