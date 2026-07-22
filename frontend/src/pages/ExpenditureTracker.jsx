import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react'; 
import axios from 'axios'; 
import { jwtDecode } from 'jwt-decode'; 
import { FcCancel } from "react-icons/fc";
import { FcPlus } from "react-icons/fc";
import { FcSalesPerformance } from "react-icons/fc";
import { TbPigMoney } from "react-icons/tb";
import { GiPayMoney } from "react-icons/gi";
import { FcBarChart } from "react-icons/fc";
import { FcPieChart } from "react-icons/fc";

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
  ArcElement,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

import { TopSectionBar } from './TopSectionBar'; 
import { FooterSection } from './FooterSection';

// Register ChartJS sub-modules securely
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
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

// Helper to format any date string into YYYY-MM based on Asia/Singapore timezone
const formatYearMonth = (dateInput) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit"
  }).format(new Date(dateInput));
};


const getDynamicBarData = (ledgerItems) => {
  const categoryTotals = {};  
  ledgerItems.forEach(item => {
    const category = item.category || "Others"; 
    const amount = parseFloat((item.net_amount || item.total_amount)) || 0; 
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

const getDynamicLineData = (ledgerItems, selectedMonth) => {
    const dateTotals = {};
    if (!selectedMonth) return { labels: [], datasets: [] };

    // Break down selected month (e.g 2026-07)
    const [year, month] = selectedMonth.split("-").map(Number);

    // Get the total number of days in this specific month
    // Passing 0 as the day returns the last day of the prior month, matching current month indexing
    const daysInMonth = new Date(year, month, 0).getDate();

    // Initialize every day of the month with 0 spending
    for (let day = 1; day <= daysInMonth; day++) {
        // Pad days to ensure "YYYY-MM-DD" matches your formatting consistency
        const fday = String(day).padStart(2, '0');
        const fmonth = String(month).padStart(2, '0');
        const fullDateKey = `${year}-${fmonth}-${fday}`;
        
        dateTotals[fullDateKey] = 0;
    }

    // Aggregate actual spending data onto those pre-defined keys
    ledgerItems.forEach(item => {
        if (!item.bill_date) return;

        const normalizedDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Singapore",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date(item.bill_date)); 

        const amount = Number((item.net_amount || item.total_amount)) || 0;
        dateTotals[normalizedDate] = (dateTotals[normalizedDate] || 0) + amount;
    });

    // Sort dates chronologically
    const sortedDates = Object.keys(dateTotals).sort();

    return {
        labels: sortedDates.map(date => {
            const [,month, day] = date.split("-");
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


const getDynamicLineDataMonths = (ledgerItems, selectedMonth) => {
  if (!selectedMonth) return { labels: [], datasets: [] };
  const [year] = selectedMonth.split("-");
  const monthTotals = {};

  // Initialize all 12 months for the selected year
  for (let m = 1; m <= 12; m++) {
    const fmonth = String(m).padStart(2, '0');
    monthTotals[`${year}-${fmonth}`] = 0;
  }
  // Aggregate expenditures
  ledgerItems.forEach(item => {
    if (!item.bill_date) return;
    const itemYearMonth = formatYearMonth(item.bill_date); // YYYY-MM
    if (itemYearMonth.startsWith(year)) {
      const amount = Number((item.net_amount || item.total_amount)) || 0;
      monthTotals[itemYearMonth] = (monthTotals[itemYearMonth] || 0) + amount;
    }
  });

  const sortedMonths = Object.keys(monthTotals).sort();
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return {
    labels: monthLabels,
    datasets: [
      {
        label: `Monthly Spending for ${year} ($)`,
        data: sortedMonths.map(m => monthTotals[m]),
        borderColor: "#edb601",
        backgroundColor: "#edb601",
        fill: false,
        tension: 0.2,
      },
    ],
  };
};

const getDynamicLineDataYears = (ledgerItems) => {
  const yearTotals = {};

  ledgerItems.forEach(item => {
    if (!item.bill_date) return;
    const year = new Date(item.bill_date).getFullYear();
    const amount = Number((item.net_amount || item.total_amount)) || 0;
    yearTotals[year] = (yearTotals[year] || 0) + amount;
  });

  const sortedYears = Object.keys(yearTotals).sort();
  if (sortedYears.length === 0) {
    const currentYear = new Date().getFullYear();
    sortedYears.push(currentYear.toString());
    yearTotals[currentYear] = 0;
  }

  return {
    labels: sortedYears,
    datasets: [
      {
        label: "Yearly Spending Trend ($)",
        data: sortedYears.map(y => yearTotals[y]),
        borderColor: "#edb601",
        // "#2ec4b6"
        backgroundColor: "#edb601",
        fill: false,
        tension: 0.2,
      },
    ],
  };
};





const getDynamicPieData= (ledgerItems) => {
  const categoryTotals = {} 
  ledgerItems.forEach(item=> {
    const category= item.category || 'others'; 
    const amount= parseFloat(item.net_amount || item.total_amount) || 0; 
    categoryTotals[category]= (categoryTotals[category] || 0)  + amount;
  });

  const colorPalette= [
    '#2ec4b6', '#e71d36', '#edb601', '#4361ee', '#ff9f1c', 
   '#7209b7', '#4caf50', '#9e9e9e'
  ]; 
  return {
    labels: Object.keys(categoryTotals), 
    datasets: [
      {
        label: "Proportion ($)",
        data: Object.values(categoryTotals), 
        backgroundColor: colorPalette.slice(0, Object.keys(categoryTotals).length), 
        borderWidth: 1,
      }
    ]
  }
}

function ExpenditureTracker() {
  const navigate = useNavigate(); 
  const [ ledger, setLedger ] = useState([]); 
  const [currentUser, setCurrentUser] = useState(null); 

  const API_EXP_URL = 'http://localhost:5001/api/exp';
  // const API_EXP_URL = 'https://jb-solver-orbital.onrender.com/api/exp';
  
  const [isModalOpen, setIsModalOpen ] = useState(false); 
  const [formData, setFormData] = useState({
    description: '', 
    category: 'Food', 
    bill_date: new Date().toISOString().split('T')[0], 
    total_amount: '', 
    currency: 'SGD', 
    target_currency: 'SGD',
    gst: 0,
    tax: 0,
    exchangeRates: 1,
  }); 

  const [ isBudgetModalOpen, setIsBudgetModalOpen ] = useState(false); 
  const [ budget, setBudget ] = useState(0); 
  const [ budgetInput, setBudgetInput ] = useState(""); 
  

  const [ selectedMonth, setSelectedMonth ] = useState(() => formatYearMonth(new Date()));

  //Currency exchange 
  const [currencies, setCurrencies]= useState(['SGD', 'MYR', 'USD', 'EUR', 'GBP', 'RMB', 'THB', 'IDR']); 
  const [targetCurrency, setTargetCurrency]= useState('SGD'); 
  const [exchangeRates, setExchangeRates]= useState({}); 

  //Option to toggle between barchart or piechart
  const [chartViewMode, setChartViewMode]= useState('bar');
  const [lineChartViewMode, setLineChartViewMode] = useState('daily'); 

  const filterLedger = ledger.filter(item => {
    if (!item.bill_date) return false; 
    return formatYearMonth(item.bill_date) === selectedMonth; 
  });

  useEffect(()=>{
    const fetchGlobalCurrencies= async ()=> {
      try {
        const response= await axios.get('https://open.er-api.com/v6/latest/USD'); 
        if (response.data && response.data.rates) {
          const currencyCodes= Object.keys(response.data.rates);
          setCurrencies(currencyCodes.sort()); // Sort codes alphabetically for cleaner dropdown selection
          setExchangeRates(response.data.rates); //store all rates relative to USD 
        }
      } catch (err) {
        console.error("Failed to fetch global currency list API, using local fallbacks:", err);
      }
    }; 
    if (isModalOpen) {
      fetchGlobalCurrencies(); 
    }

  }, [isModalOpen])

  const calculatePrevMonthSpend = (items, currentSelectedMonth) => {
      const [year, month] = currentSelectedMonth.split("-").map(Number);
      // JS months are 0-indexed. passing (month - 2) automatically rolls back to the correct previous month safely
      const previousDate = new Date(year, month - 2, 1);
      const prevMonthStr = formatYearMonth(previousDate);

      return items.reduce((total, item) => {
          if (!item.bill_date) return total;
          if (formatYearMonth(item.bill_date) === prevMonthStr) {
              return total + Number((item.net_amount || item.total_amount));
          }
          return total;
      }, 0);

  };


  const totalAmountMonth = filterLedger.reduce((sum, item) => sum + Number((item.net_amount || item.total_amount)), 0);
  const totalAmountPrevMonth = calculatePrevMonthSpend(ledger, selectedMonth); 

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
      total_amount: parseFloat(finalConvertedTotal.toFixed(2) || 0), 
      // total_amount: parseFloat(formData.total_amount) || 0, 
      net_amount: parseFloat(finalConvertedTotal.toFixed(2) || 0), 
      currency: formData.currency, 
      target_currency: formData.target_currency,
      gst: parseFloat(formData.gst) || 0,
      tax: parseFloat(formData.tax) || 0,
      exchangeRates: derivedExchangeRate,
      group_id: null
    }


    axios.post(`${API_EXP_URL}/transaction`, newTransaction)
         .then(res => {
            const savedTransaction = res.data.transaction || res.data; 
            const updatedLedger = [savedTransaction, ...ledger];
            setLedger(updatedLedger); 

            setIsModalOpen(false); 
            setFormData({
              description: '', 
              category: 'Food', 
              bill_date: new Date().toISOString().split('T')[0],
              total_amount: '', 
              currency: 'SGD', 
              target_currency: 'SGD', 
              gst: 0, 
              tax: 0
            });
         })
         .catch(err => console.error('Error creating expenditure record:', err)); 
  }

  const handleDelete = (billId) => {
    const confirmed = window.confirm('Are you sure you want to delete this expenditure record?');
    if (!confirmed) return; 

    axios.delete(`${API_EXP_URL}/transaction/${billId}`)
        .then((res) => {
          alert('Transaction deleted successfully!'); 
          const updatedLedger = ledger.filter(item => item.bill_id !== billId);
          setLedger(updatedLedger);
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
      if (Array.isArray(res.data)) {
        setLedger(res.data);
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

  // const handleBudgetInput = (e) => {
  //   e.preventDefault(); 
  //   const value = Number(budgetInput); 
  //   setBudget(value); 
  //   localStorage.setItem("budget", value); 
  //   setIsBudgetModalOpen(false); 
  // }
  
  // Helper to turn "YYYY-MM" from state into database-friendly "YYYY-MM-01"
    const getFirstOfMonthString = (yearMonthStr) => `${yearMonthStr}-01`;

  // Fetch budget dynamically from backend when month or user changes
  useEffect(() => {
    if (!currentUser) return;
    
    const monthTarget = getFirstOfMonthString(selectedMonth);
    axios.get(`${API_EXP_URL}/budget/${currentUser.user_id}/${monthTarget}`)
      .then(res => {
        setBudget(Number(res.data.budget_amount));
      })
      .catch(err => console.error("Error fetching budget:", err));
  }, [selectedMonth, currentUser]);

// Submit budget to database
  const handleBudgetInput = (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const budgetData = {
      user_id: currentUser.user_id,
      budget_amount: parseFloat(budgetInput) || 0,
      budget_month: getFirstOfMonthString(selectedMonth) // Saves it targeted to currently viewed month
    };

    axios.post(`${API_EXP_URL}/budget`, budgetData)
      .then(res => {
        setBudget(Number(res.data.budget_amount));
        setIsBudgetModalOpen(false);
        alert("Budget updated for this month!");
      })
      .catch(err => {
        console.error('Error saving budget:', err);
        alert(`Failed to save budget ${err.response?.data?.error || err.message}`);
      });
  };


  const budgetUsedPercent = budget > 0 ? (totalAmountMonth / budget) * 100 : 0; 
  let momVariancePercent = 0; 
  if (totalAmountPrevMonth > 0) {
    momVariancePercent = ((totalAmountMonth - totalAmountPrevMonth) / totalAmountPrevMonth) * 100; 
  } else if (totalAmountMonth > 0) {
    momVariancePercent = 100; 
  }

  //Derived calculations for the add expense modal.
  const budgetRemainingPercent = budget > 0 ? (((budget - totalAmountMonth) / budget) * 100) : 0;
  const baseCurrency= formData.currency || 'SGD'; 
  const baseRate= exchangeRates[baseCurrency] || 1; 
  const targetRate= exchangeRates[targetCurrency] ||1;
  const derivedExchangeRate= baseCurrency=== targetCurrency ? 1: (targetRate/ baseRate);
  const rawAmount= parseFloat(formData.total_amount) || 0; 
  const gstModifier= (parseFloat(formData.gst) || 0)/100; 
  const taxModifier= (parseFloat(formData.tax) || 0)/100;
  const amountWithTaxesBase= rawAmount *(1+ gstModifier + taxModifier); 
  const finalConvertedTotal= amountWithTaxesBase* derivedExchangeRate;

  return (
    <div className="homepage-container">
      <TopSectionBar/>
    
      <div className='home-body-ex'>
        <div className='card' style={{gridArea: 'box-1'}}>
          <div className="card-description">Budget this month</div>
          <div className="number">${budget.toFixed(2)}</div>
          <div className={`percentage-description ${(budget - totalAmountMonth).toFixed(2) > 0 ? 'status-good' : 'status-bad'}`}>{(budget - totalAmountMonth).toFixed(2) > 0 ? 'Within Budget' : 'Exceeded Budget'}</div>
        </div>

        <div className='card' style={{gridArea: 'box-2'}}>
          <div className="card-description">Expenditure this month</div> 
          <div className="number">${totalAmountMonth.toFixed(2)}</div>
          <div className={`percentage-description ${budgetUsedPercent > 100 ? 'status-bad' : 'status-good'}`}>
            {budgetUsedPercent > 0 ? `${budgetUsedPercent.toFixed(1)}% of budget used` : '0% used'}
          </div>
        </div>

        <div className='card' style={{gridArea: 'box-3'}}>
          <div className="card-description">Comparison with prev month</div>
          <div className="number">${totalAmountPrevMonth.toFixed(2)}</div>
          <div className={`percentage-description ${momVariancePercent > 0 ? 'status-bad' : 'status-good'}`}>
            {momVariancePercent >= 0 ? '▲ ' : '▼ '}
            {Math.abs(momVariancePercent).toFixed(1)}% 
          </div>
        </div>

        <div className='card' style={{gridArea: 'box-4'}}>
          <div className="card-description">Remaining Budget</div>
          <div className="number">${(budget - totalAmountMonth).toFixed(2)}</div>
          <div className={`percentage-description ${(budget - totalAmountMonth) >= 0 ? 'status-good' : 'status-bad'}`}>
            {budgetRemainingPercent < 0 ? "Cut down spending" : budgetRemainingPercent.toFixed(1) + "% left"}
          </div>
        </div>
        
        <div className="card" style={{ gridArea: "box-5", minHeight: '320px', padding: '15px', display: 'flex', flexDirection: 'column' }}>
          {/* <h3 style={{ margin: '0 0 10px 0' }}>Spending Trend</h3> */}
          <div className='linechart_title' style= {{display: 'flex', alignItems: 'center', minHeight: '34px', marginBottom: '10px'}}>  
            <h3 style= {{margin: 0 }}>Spending Trend</h3>
            <select className='slider' value={lineChartViewMode} onChange={(e) => setLineChartViewMode(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          
          <div style={{ position: 'relative', width: '100%', height: '95%', paddingBottom: '10px'}}>
            {filterLedger.length === 0 ? (
              <p>No transactions found for this month.</p>
            ) : (
              <>
                {lineChartViewMode === 'daily' && (
                  filterLedger.length === 0 ? <p>No transactions this month.</p> : <Line data={getDynamicLineData(filterLedger, selectedMonth)} options={chartOptions} />
                )}
                {lineChartViewMode === 'monthly' && (
                  <Line data={getDynamicLineDataMonths(ledger, selectedMonth)} options={chartOptions} />
                )}
                {lineChartViewMode === 'yearly' && (
                  <Line data={getDynamicLineDataYears(ledger)} options={chartOptions} />
                )}
              </>
            )}
          </div>
        </div>

        <div className='card' style={{ gridArea: 'box-6', minHeight: '320px', padding: '15px', display: 'flex', flexDirection: 'column' }}> 
          <div className= 'category_breakdown_title'> 
            <h3 style= {{margin: 0}}>Category Breakdown</h3> 
            <select className="slider" onClick={(e) => setChartViewMode(e.target.value)}>
              <option value='pie'>Pie Chart View</option>
              <option value='bar'>Bar Chart View</option>
            </select>
          </div> 
          <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
            {filterLedger.length === 0 ? (
              <p>No transactions found for this month.</p>
            ) : chartViewMode=== 'bar' ? (
              <Bar data={getDynamicBarData(filterLedger)} options={chartOptions} />
            ) : (
              <Pie data= {getDynamicPieData(filterLedger)} options= {chartOptions} />
            )}
          </div>
        </div>

        <div className='card' style={{gridArea: 'box-7'}}>
          <div className= "transactionHistory_header"> 
            <h3>Transaction History</h3>
            <input
              type='month'
              className='date-selector'
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          <div className="history-card">
            {filterLedger.length === 0 ? (
              <p>No transactions found for this month.</p>
            ) : (
              <div className='transaction-list'>
                {filterLedger.map((item, index) => (
                  <div key={index} className='transaction-row'>
                    <p>Category: {item.category}</p>
                    <p className='desc'>Description: {item.description} </p>
                    <p className='amt'>({item.target_currency} {item.net_amount})</p>
                    <p>{new Date(item.bill_date).toLocaleDateString()}</p>
                    <button onClick={() => handleDelete(item.bill_id)}
                            className='btn-delete-item'><FcCancel size={30}/></button>
            
                  </div>
                ))}
              </div>
            )}
          </div>
            
          <div className='btns'>
              <div className="button-wrapper">
                  <button className="exp-btn" onClick={() => setIsModalOpen(true)}>
                      <FcPlus size={40} />
                  </button>
                  <span className="hover-tooltip">Add Expenditure</span>
              </div>

              <div className="button-wrapper">
                  <button className="exp-btn" onClick={() => { setIsBudgetModalOpen(true); setBudgetInput(budget); }}>
                      <FcSalesPerformance size={40} />
                  </button>
                  <span className="hover-tooltip">Set Budget</span>
              </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-header-banner">Add Personal Expenditure</h3>
            <form onSubmit={handleFormSubmit} className= "form-content">
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
                <label className= "GSTLabel">GST (%): </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  name="gst"
                  value={formData.gst}
                  onChange={handleInputChange}
                  className= "GSTInput"
                /> 
              </div>
              <div className= "form-group"> 
                <label className= "addition_TaxLabel">Additional Tax (%): </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  name="tax"

                  value={formData.tax}
                  onChange={handleInputChange}
                  className= "addition_TaxInput"
                />
              </div>
              <div className="form-group">
                <label>Currency:</label>
                <select name="currency" value={formData.currency} onChange={handleInputChange}>
                  {/* <option value="SGD">SGD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="MYR">MYR</option> */}
                  {currencies.map(code=> (
                    <option key= {`target-${code}`} value= {code}> 
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Convert To:</label>
                <select name="target_currency" value={targetCurrency} onChange={(e)=> setTargetCurrency(e.target.value)}>
                  {currencies.map(code=> (
                    <option key= {`target-${code}`} value= {code}> 
                      {code}
                    </option>
                  ))}
                </select>
              </div >
              <div> 
                <p> 
                  <strong>Exchange Rate: </strong> 1 {baseCurrency} = {derivedExchangeRate.toFixed(4)} {targetCurrency}
                </p>
                <p> 
                  <strong>Subtotal (with Taxes): </strong> {baseCurrency} {amountWithTaxesBase.toFixed(2)}
                </p>
                <p> 
                  <strong>Final Converted Total: </strong> {targetCurrency} {finalConvertedTotal.toFixed(2)}
                </p>
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
            <div className="modal-content-2">
                <form onSubmit={handleBudgetInput}>
                  <div className= "budget_input_division">  
                    <GiPayMoney size= {50}/>
                    <TbPigMoney size={50}/>
                    <p> Set your budget for the month: </p>
                    <input type="number" name="budget" className= "budget_input_text" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} />
                  </div>
                  <div className= "budget_btn_division"> 
                    <button type='button' className='btn-cancel' onClick={() => setIsBudgetModalOpen(false)}>Cancel</button>
                    <button type='submit' className='btn-submit'>Save</button>
                  </div>
                  
                </form>
            </div>
          </div>
      )}

      <FooterSection/>
    </div>
  );
}

export default ExpenditureTracker;

