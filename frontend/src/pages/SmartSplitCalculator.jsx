import { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import '../SmartBill.css'; 
// import '../App.css'; 
import { FcCurrencyExchange } from "react-icons/fc";
import { MdCalculate } from "react-icons/md";
import { GrSend } from "react-icons/gr";


// smart split calculator modal that appears after clicking the calculator button in expenditure tracker
function SmartSplitCalculator({
  show,
  onClose,
  selectedGroup,
  currentUser,
  groupMembers
}) {
  const [billData, setBillData] = useState({
    description: '',
    category: 'Food',
    currency: 'SGD',
    splitMethod: 'equal',
    gst: 0,
    tax: 0,
    sharedCost: 0
  });

  const [payers, setPayers] = useState([]);
  const [individualItems, setIndividualItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [billTransactions, setBillTransactions] = useState([]);
  const [billPreview, setBillPreview] = useState("");

  //Initialize core currencies 
  const [currencies, setCurrencies]= useState(['SGD', 'MYR', 'USD', 'EUR', 'GBP', 'RMB', 'THB', 'IDR']); 
  const [targetCurrency, setTargetCurrency]= useState('SGD'); 
  const [exchangeRates, setExchangeRates]= useState({}); 

  //Side effect: Dynamically render the group members and what he/she pays
  useEffect(() => {
    if (!groupMembers || groupMembers.length === 0) return;
    // Map initial state trackers for the 'Who Paid' ledger module grid
    setPayers(
      groupMembers.map(member => ({
        userId: member.user_id,
        username: member.username,
        paid: 0
      }))
    );
    // Map initial parameter lines tracking item costs for specialized proportional allocations
    setIndividualItems(
      groupMembers.map(member => ({
        userId: member.user_id,
        username: member.username,
        itemCost: 0
      }))
    );
  }, [groupMembers]);

  //Queries external currency exchange rate (with USD as base reference) on modal load
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
    if (show) {
      fetchGlobalCurrencies(); 
    }

  }, [show]) // Locked dependencies prevent hitting the server when tracking local form input variations

  if (!show) return null;

  // Generic inputs controller mapper tracking basic text strings and select values changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setBillData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  // Form updates dispatcher targeting numerical value inside 'who paid section'
  const updatePayerAmount = (userId, value) => {
    const parsedValue= value === "" ? "": parseFloat(value); 
    setPayers(prev =>
      prev.map(p =>
        p.userId === userId ? { ...p, paid: parsedValue } : p
      )
    );
  };
  // Form updates dispatcher targeting specialized individual orders tracking lines
  const updateItemAmount = (userId, amount) => {
    const parsedValue= amount === "" ? "" : parseFloat(amount); 
    setIndividualItems(prev =>
      prev.map(item =>
        item.userId === userId ? { ...item, itemCost: parsedValue} : item
      )
    );
  };

  // Calculations
  const subtotalPaid = payers.reduce((sum, p) => sum + Number(p.paid || 0), 0);
  const gstAmount = subtotalPaid * (Number(billData.gst || 0) / 100);
  const taxAmount = subtotalPaid * (Number(billData.tax || 0) / 100);
  const baseFinalAmount = subtotalPaid + gstAmount + taxAmount;
  //Account for currency 
  let currencyRate = 1;
  if (exchangeRates[billData.currency] && exchangeRates[targetCurrency]) {
    const baseToUsd = exchangeRates[billData.currency];   // Rate of currency paid in
    const targetToUsd = exchangeRates[targetCurrency];   // Rate of currency converting to
    
    // Cross-multiplication formula
    currencyRate = targetToUsd / baseToUsd; // rate of target currency/ rate of base currency
  }
  const finalAmount= baseFinalAmount*currencyRate;



  const generateBillSummary = (transactions) => {
  let summary = `💰 Bill Summary\n${billData.description}\n\n`;

    transactions.forEach(tx => {
      const debtor = groupMembers.find(
        m => m.user_id == tx.debtorId
      );

      const creditor = groupMembers.find(
        m => m.user_id == tx.creditorId
      );    

      summary += `${debtor?.username} owes ${creditor?.username} ${targetCurrency} ${Number(tx.amount).toFixed(2)}\n`;
    });

    return summary;
  };
  // ispatches bill metrics calculations blocks to backend database routes
  // ONLY calculates split metrics without database insertion

  const resetFormAndPreview = () => {
    setBillData({
      description: '',
      category: 'Food',
      currency: 'SGD',
      splitMethod: 'equal',
      gst: 0,
      tax: 0,
      sharedCost: 0
    });
    setBillTransactions([]);
    setBillPreview(""); // 👈 Clears the previous bill settlement preview!
    
    if (groupMembers && groupMembers.length > 0) {
      setPayers(
        groupMembers.map(member => ({
          userId: member.user_id,
          username: member.username,
          paid: 0
        }))
      );
      setIndividualItems(
        groupMembers.map(member => ({
          userId: member.user_id,
          username: member.username,
          itemCost: 0
        }))
      );
    }
  };
  const submitBill = async () => {
    try {
      const activePayers = payers.filter(p => p.paid > 0);

      if (activePayers.length === 0) {
        alert('At least one payer is required.');
        return;
      }

      if (!billData.description.trim()) {
        alert('Please enter a description.');
        return;
      }
      
      const totalIndividualOrders = individualItems.reduce(
        (sum, item) => sum + Number(item.itemCost || 0),
        0
      );

      const sharedCost = Number(billData.sharedCost || 0);
      const expectedTotal = totalIndividualOrders + sharedCost;

      if (
        (billData.splitMethod === "proportional" || billData.splitMethod === "custom") &&
        Math.abs(expectedTotal - subtotalPaid) > 0.01
      ) {
        alert(
          `The bill does not balance.\n\n` +
          `Total Paid: ${billData.currency} ${subtotalPaid.toFixed(2)}\n` +
          `Individual Orders + Shared Items: ${billData.currency} ${expectedTotal.toFixed(2)}\n\n` +
          `Please ensure the totals match before submitting.`
        );
        return;
      }

      setLoading(true);

      // Issue payload bundle mapping parameters configuration to the server controller endpoint with dryRun: true
      const response = await axios.post(
        'https://jb-solver-orbital.onrender.com/api/bills/split_smart',
        // 'http://localhost:5001/api/bills/split_smart',
        {
          groupId: selectedGroup.group_id,
          description: billData.description,
          category: billData.category,
          currency: billData.currency,
          targetCurrency: targetCurrency,  
          currencyRate: currencyRate, 
          splitMethod: billData.splitMethod,
          payers: activePayers,
          individualItems: individualItems.filter(item => item.itemCost > 0),
          sharedCost: Number(billData.sharedCost || 0),
          gst: Number(billData.gst || 0),
          tax: Number(billData.tax || 0),
          dryRun: true // 👈 Safeguard against DB write
        }
      );
      
      setBillTransactions(response.data.transactions);
      const summary = generateBillSummary(response.data.transactions);
      setBillPreview(summary);
      alert(`Calculation completed! Preview generated below. Click send to finalize and save.`);
      
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to calculate smart split');
    } finally {
      setLoading(false);
    }
  }; 

  // Commits the bill data permanently to DB, then pushes to chat
  const sendBillSummaryToGroup = async () => {
    if (billTransactions.length === 0) {
        alert('Please calculate the bill preview first before saving.');
        return; 
    }
    try {
        setLoading(true);
        const activePayers = payers.filter(p => p.paid > 0);

        // 1. Permanently record bill details to database right now
        const dbResponse = await axios.post(
          // 'https://jb-solver-orbital.onrender.com/api/bills/split_smart',
          'http://localhost:5001/api/bills/split_smart',
          {
            groupId: selectedGroup.group_id,
            description: billData.description,
            category: billData.category,
            currency: billData.currency,
            targetCurrency: targetCurrency,  
            currencyRate: currencyRate, 
            splitMethod: billData.splitMethod,
            payers: activePayers,
            individualItems: individualItems.filter(item => item.itemCost > 0),
            sharedCost: Number(billData.sharedCost || 0),
            gst: Number(billData.gst || 0),
            tax: Number(billData.tax || 0),
            dryRun: false // 👈 Tells database to commit changes now
          }
        );

        // 2. Transmit the calculated plain-text string out to the group conversation timeline
        await axios.post(
            // 'https://jb-solver-orbital.onrender.com/api/groups/message',
            'http://localhost:5001/api/groups/message', 
            {
                groupId: selectedGroup.group_id, 
                senderId: currentUser.user_id, 
                messageText: billPreview
            }
        );

        alert('Bill saved securely and summary sent to your group chat!'); 
        resetFormAndPreview();
        onClose();
    } catch (err) {
        console.error(err); 
        alert(err.response?.data?.error || 'Failed to save bill or send summary.'); 
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <h3>Smart Bill Splitter</h3>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={20}/>
          </button>
        </div>

        <div className="modal-body">
          <form className="calculator-form" onSubmit={(e) => e.preventDefault()}>
            <div className= "descriptionDivision"> 
              <label className= "descriptionLabel">Description: </label>
              
              <input
                  type="text"
                  name="description"
                  value={billData.description}
                  onChange={handleChange}
                  placeholder="Your group expenditure..."
                  className='descriptionInput'
                />
            </div>
            <div className= "categoryDivision"> 
              <label className= "categoryLabel">Category: </label>
              <select name="category" value={billData.category} onChange={handleChange} className= "categoryType">
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Travel">Travel</option>
                <option value="Shopping">Shopping</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Healthcare">Healthcare</option>
              </select>
            </div>
            <div className= "splitMethodDivision"> 
              <label className= "splitMethodLabel">Split Method: </label>
              <select name="splitMethod" value={billData.splitMethod} onChange={handleChange} className= "splitMethodOption">
                <option value="equal">Equal Split</option>
                <option value="proportional">Proportional Split</option>
                <option value="custom">Custom Split</option>
              </select>
            </div>

            <div className= "currencyDivision"> 
              <label className= "currencyLabel">Currency <FcCurrencyExchange size={20} />: </label>
              
              <select name="currency" value={billData.currency} onChange={handleChange} className= "currencyOptions">
               {currencies.map((code)=> (
                <option key= {code} value= {code}> 
                  {code}
                </option>
               ))
               }
              </select>
              
            </div>
            <div className= "currencyDivision"> 
              <label className= "currencyLabel">Convert To: </label>
              
              <select name="targetCurrency" value={targetCurrency} onChange={(e)=> setTargetCurrency(e.target.value)} className= "currencyOptions">
               {currencies.map((code)=> (
                <option key= {`target-${code}`} value= {code}> 
                  {code}
                </option>
               ))}
              </select>
              
            </div>

            <div className= "GSTDivision" >
              <label className= "GSTLabel">GST (%): </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                name="gst"
                value={billData.gst}
                onChange={handleChange}
                className= "GSTInput"
              /> 
            </div>

            <div className= "additionTaxDivision"> 
              <label className= "additionTaxLabel">Additional Tax (%): </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                name="tax"

                value={billData.tax}
                onChange={handleChange}
                className= "additionTaxInput"
              />

            </div>

            <div className= "whoPaidDivision"> 
              <strong style={{ fontSize: "large", padding: '10px' }}>Who Paid?</strong>
        
              {payers.length === 0 ? (
                <p>Loading members profile details...</p>
              ) : (
                payers.map((payer) => (
                  <div key={payer.userId} className="payer-row">
                    <span className= "payerRowLabel">
                      {payer.username}
                      {currentUser && payer.userId === currentUser.user_id ? ' (You)' : ''}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payer.paid}
                      placeholder="0.00"
                      onChange={(e) => updatePayerAmount(payer.userId, e.target.value)}
                      className= "payerRowInput"
                    />
                  </div>
                ))
              )}
            </div>
            

            <div className= "proportionalDivision"> 
              {billData.splitMethod === 'equal' && (
                <> 
                  <strong style={{ fontSize: "large", padding: '10px' }}>Bill is split equally</strong>
                </>
              ) }
              {billData.splitMethod === 'proportional' && (
                <>
                  <strong style={{ fontSize: "large", padding: '10px' }}>Individual Orders</strong>
                  <p style={{ padding: '10px' }}>Enter what each member personally consumed.</p>
                  {individualItems.map(item => (
                    <div key={item.userId} className="payer-row">
                      <span className= "proportionalLabel">{item.username}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.itemCost}
                        placeholder="0.00"
                        onChange={(e) => updateItemAmount(item.userId, e.target.value)}
                        className= "proportionalInput"
                      />
                    </div>
                  ))}
                </>
              )}

              {billData.splitMethod === 'custom' && (
                <>
                  <strong style={{ fontSize: "large", padding: '10px' }}>Individual Orders</strong>
                  <p style={{ padding: '10px' }}>Enter what each member personally consumed.</p>
                  {individualItems.map(item => (
                    <div key={item.userId} className="payer-row">
                      <span className= "proportionalLabel">{item.username}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.itemCost}
                        placeholder="0.00"
                        onChange={(e) => updateItemAmount(item.userId, e.target.value)}
                        className= "proportionalInput"
                      />
                    </div>
                  ))}
                  <hr />
                  <strong style={{ fontSize: "large", padding: '10px' }}>Shared items</strong>
                  <p style={{ padding: '10px' }}>Example: appetizers, shared fries, group platter, shared drinks</p>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="sharedCost"
                    value={billData.sharedCost}
                    onChange={handleChange}
                    className= "proportionalInput"
                  />
                </>
              )}
            </div> 

        

            <div className= "billSummaryDivision"> 
              <strong style={{ fontSize: "large", padding: '10px' }}>Bill Summary</strong>
              <p style={{ padding: '10px' }}>Subtotal Paid: {billData.currency} {subtotalPaid.toFixed(2)}</p>
              
              {billData.currency !== targetCurrency && (
                  <p style={{ margin: 0, padding: '2px', color: '#2b6cb0', fontSize: '0.95em' }}>
                     Rate: 1 {billData.currency} = {currencyRate.toFixed(4)} {targetCurrency}
                  </p>
              )}
              <p style={{ padding: '10px' }}><strong>Final Bill ({targetCurrency}):</strong> {targetCurrency} {finalAmount.toFixed(2)}</p>


              <div className='buttons'>
                <div className='button-wrapper'>
                <button className= "smartSplitButton" type="button" onClick={submitBill} disabled={loading}>
                    <MdCalculate size={30}/>
                </button>
                <span className='hover-tooltip'> {loading ? 'Calculating...  ' : 'Calculate '}</span>
              </div>
              
              
              <div className='button-wrapper'>
                <button className= "billSummaryButton" type='button' onClick={sendBillSummaryToGroup}>
                    <GrSend size={30}/>
                </button>
                <span className='hover-tooltip'> Send bill summary to group</span>
              </div>
              </div>
              
              

            </div>
                {billPreview && (
                <div className="bill-preview">
                    <h4>Settlement Preview</h4>

                    <pre>{billPreview}</pre>
                </div>
                )}
          </form>
        </div>

      </div>
    </div>
  );
}

export default SmartSplitCalculator;


