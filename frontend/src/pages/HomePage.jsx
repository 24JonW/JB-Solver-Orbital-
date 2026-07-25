import { useNavigate } from 'react-router-dom';
import '../App.css';

// Asset Imports: Logos and default images
import picture from '../assets/picture.png'; 
import {useState, useEffect} from 'react'; 
import axios from 'axios'; 

// Imports React Icons 
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { GiPartyPopper } from "react-icons/gi";


import { TopSectionBar } from './TopSectionBar'; 
import { FooterSection } from './FooterSection';
import { FcAdvertising } from "react-icons/fc";
import { FcDebt } from "react-icons/fc";
import { FcCallTransfer } from "react-icons/fc";
import { FaBook } from "react-icons/fa";

function HomePage() {
  const navigate = useNavigate(); // Hook to handle client-side programmatic routing
  const [email, setEmail]= useState(''); 
  const [userId, setUserId]= useState(null); 
  const [username, setUsername] = useState(''); 
  const [outstandingLedger, setOutstandingLedger]= useState([]); // Stores the array of unpaid debts

  const [peopleWhoOweMe, setPeopleWhoOweMe] = useState([]); //4th Grid state 
  const [seed, setSeed]= useState('default');
  const [ isGuideOpen, setIsGuideOpen ] = useState(false)

  // 2 API Endpoints 
  // const API_BASE_URL= 'http://localhost:5001/api/accounts'; 
  // const API_BILLS_URL= 'http://localhost:5001/api/bills'; 

  const API_BASE_URL = 'https://jb-solver-orbital.onrender.com/api/accounts'; 
  const API_BILLS_URL = 'https://jb-solver-orbital.onrender.com/api/bills';

  

  useEffect(()=> {
    // User Authentication: Check if a user session token/ID exists in the browser storage
    const storedUserId= localStorage.getItem('userId'); 
    if (!storedUserId) {
      navigate('/'); // Boot back to login page if no authenticated user ID is found
      return; 
    }
    // Data Fetching: Retrieve profile credentials for the current user
    axios.get(`${API_BASE_URL}/${storedUserId}`)
      .then((res)=> {
        const data= res.data; 
        setEmail(data.email);
        setUserId(data.user_id);
        setUsername(data.username);
        setSeed(data.avatar_seed || 'default');
      })
      .catch((err)=> {
        console.error('Error fetching user profile with Axios:', err);
      })
    // Data Fetching: Gather all unpaid split bill transactions matching this specific user ID
    axios.get(`${API_BILLS_URL}/outstanding/${storedUserId}`)
      .then((res)=> {
        if (Array.isArray(res.data)) {
          setOutstandingLedger(res.data) // Update state array with outstanding bills data
        }
      }).catch((err)=> {
        console.error('Error fetching outstanding payments:', err);
      })
    
    // Data Fetching: Fetch people who still owes you 
    axios.get(`${API_BILLS_URL}/receivables/${storedUserId}`) 
      .then((res)=> {
        if (Array.isArray(res.data)) {
          setPeopleWhoOweMe(res.data);
        }
      }).catch((err)=> {
        console.error('Error fetching receivables:', err);
      })

  }, [navigate]); // 'Navigate' as the only dependency array

  // Updates transaction status to 'paid' when the user clicks settle
  const handleSettleHomeShare = (shareId) => {
    const confirmed = window.confirm('Are you sure you want to settle bill'); 
    if (!confirmed) return; // Exit execution context if user cancels out of popup confirmation
    axios.post(`${API_BILLS_URL}/settle-share`, { shareId })
      .then(() => {
        // Filter out the settled row instantly without reloading the page
        setOutstandingLedger(prev => prev.filter(item => item.share_id !== shareId));
        alert("Payment settled successfully!");
      })
      .catch((err) => console.error("Error settling payment:", err));
  };

  // Group and sum up the outstanding items by creditor_user_id
  const quickPaymentLedger = Object.values(
    outstandingLedger.reduce((acc, item) => {
      const cId = item.creditor_user_id;
      if (!acc[cId]) {
        acc[cId] = {
          creditor_user_id: cId,
          creditor_name: item.creditor_name,
          target_currency: item.target_currency,
          total_owed: 0
        };
      }
      acc[cId].total_owed += parseFloat(item.amount_owed || 0);
      return acc;
    }, {})
  );

  // Handles settling ALL combined debts to a single creditor user at once
  const handleSettleBulkShares = (creditorId, creditorName) => {
    const confirmed = window.confirm(`Are you sure you want to settle all debts with ${creditorName}?`); 
    if (!confirmed) return;

    axios.post(`${API_BILLS_URL}/settle-bulk`, { 
      debtorId: userId, // Current logged-in user
      creditorId: creditorId 
    })
    .then(() => {
        // Optimistically remove all settled rows belonging to this creditor from UI state immediately
        setOutstandingLedger(prev => prev.filter(item => item.creditor_user_id !== creditorId));
        alert(`Successfully settled all balances with ${creditorName}!`);
    })
    .catch((err) => console.error("Error with bulk settlement:", err));
  };

  const handleChasePayment = (debtor)=> {
    const confirmed= window.confirm(`Send payment reminders to ${debtor.debtor_username}`); 
    if (!confirmed) return; 
    axios.post(`${API_BILLS_URL}/chase-payment`, {
      creditorId: userId, 
      creditorName: username, 
      debtorId: debtor.debtor_user_id, 
      debtorUsername: debtor.debtor_username, 
      debtorEmail: debtor.debtor_email, 
      amountOwed: parseFloat(debtor.total_owed).toFixed(2)
    })
    .then(()=> {
      alert(`Reminder notifications send to ${debtor.debtor_username}!`); 
    })
    .catch((err)=> console.error("Error chasing payment:", err));
  }

  return (
    <div className="homepage-container">
      {/* Global Navigation bar */}
      <TopSectionBar/>
      
      {/* Main dashboard body layout */}
      <div className='home-body'>
        {/* CARD 1: User Profile Context Box */}
        <div className='profile-card'>
          <div className='profile-header'>
              <img src={`https://api.dicebear.com/9.x/big-smile/svg?seed=${encodeURIComponent(seed)}`} className='profilePicture-img' />
              <div className='profile-main-info'>
                  <h2><b>Username: {username}</b></h2> {/* <p>Community Member</p> */}

                  
              </div>
          </div>
          <div className='profile-details'>
              <p><strong>Email:</strong> {email}</p>
              <p><strong>ID:</strong> {userId}</p>
          </div>
          <div>
            <button className='edit-profile-btn' onClick= {()=> {
                setIsGuideOpen(true);
              }}>
                Quick User Guide   
            </button>

          </div>
          
          
        </div>
        {/* Card 2: Quick Payment Box*/}
        <div className='profile-card' style={{ gridArea: 'box2'}}>
          <div className='profile-main-info'>
              <FcAdvertising className='task-icon' size={45}/>
              <h2><b>Tasks to do!</b></h2>
            
          </div>
         
          <div>
            {/* <h4 className='bulk-payment-title'>Quick Bulk Payment By Person</h4> */}
            <div className='tasks-todo'>
              {quickPaymentLedger.length === 0 ? (
                <p>
                  All clear! No group summaries to pay off.
                </p>
              ) : (
                quickPaymentLedger.map((summary) => (
                  <div key={summary.creditor_user_id} className="home-ledger-row" style={{ padding: '10px 0', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <h4 className="totalOwed">Total Owed to {summary.creditor_name}</h4>
                      <span className='bulkPaymentAmount' style={{color:'#ef4444', fontSize:'16px'}}>
                        {summary.target_currency} {summary.total_owed.toFixed(2)}
                      </span>
                    </div>
                    <div className="button-wrapper"> 
                      <button 
                        className="homePageSettleButton" 
                        style={{ margin: 0, padding: '6px 12px', fontSize: '14px' }}
                        onClick={() => handleSettleBulkShares(summary.creditor_user_id, summary.creditor_name)}
                      >
                        <FaMoneyBillTransfer size={45} color={'#6bc16f'}/>
                      </button>
                      <span className="hover-tooltip">Settle All</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
        

        {/* CARD 3. Outstanding Payments Box */}
        <div className='profile-card' style={{ gridArea: 'box3', display: 'flex', flexDirection: 'column' }}>
          <div className='profile-main-info'>
            <FcDebt className='task-icon' size={45}/>
            <h2><b>Outstanding Payments</b></h2>
          </div>
          
          <div className="home-debt-scroll-container" style={{ flex: 1, overflowY: 'auto', marginTop: '10px', textAlign: 'left'}}>
            {outstandingLedger.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#667781', marginTop: '20px' }}>
                <GiPartyPopper size={45} color={'#edb601'}/> No pending payments. Your balance is completely clear!
              </p>
            ) : (
              outstandingLedger.map((item) => (
                <div key={item.share_id} className="home-ledger-row" style={{ padding: '10px 0', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '17px' }}>{item.description}</h4>
                    <p style={{ margin: 0, fontSize: '17px', color: '#4b5563' }}>
                      You owe <strong>{item.creditor_name}</strong>
                    </p>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>
                      {item.target_currency} {parseFloat(item.amount_owed).toFixed(2)}
                    </span>
                  </div>
                  <div className= "button-wrapper"> 
                  <button 
                    className="homePageSettleButton" 
                    style={{ margin: 0, padding: '6px 12px', fontSize: '14px' }}
                    onClick={() => handleSettleHomeShare(item.share_id)}
                  >
                    <FaMoneyBillTransfer size={45} color={'#6bc16f'}/>
                  </button>
                  <span className="hover-tooltip">Settle</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CARD 4: Records who still Owe you */}
        <div className= 'profile-card' style={{ gridArea: 'box4',  display: 'flex', flexDirection: 'column', marginBottom: '10px'}}> 
          <div className='profile-main-info'>
              <FcCallTransfer size={45}/>
              <h2 className='chase-title'><b> Chase people who still owes you</b></h2>
          </div>
          
          <div className= "home-debt-scroll-container" style= {{flex: 1, overflowY: 'auto', marginTop: '10px'}}> 
            {peopleWhoOweMe.length=== 0 ? (
              <p style={{ textAlign: 'center', color: '#667781', marginTop: '25px' }}> 
                No active receivables found.
              </p>
            ): (
              peopleWhoOweMe.map((debtor)=> (
                <div key= {debtor.debtor_user_id} className= "home-leder-row" style= {{padding: '10px 0', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> 
                  <div> 
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '17px' }}>{debtor.debtor_username}</h4>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                      SGD {parseFloat(debtor.total_owed).toFixed(2)}
                    </span>
                  </div>
                  <div> 
                    <button 
                      className= "chasePaymentButton"
                      onClick= {()=> handleChasePayment(debtor)}
                    >
                      Chase Payment
                    </button>
                  </div>
                </div> 
              ))
            )}

          </div>
        </div>

      </div>

      {isGuideOpen ? 
        <div className='modal-backdrop' onClick={() => {setIsGuideOpen(false)}}>
          <div className='modal-content'>
            <div className='modal-header' style={{justifyContent:'center'}}>
              <FaBook size={20} style={{marginRight: '10px'}}/>
              <b>Instruction guide</b>
              
              </div>
            <div className='modal-body'>
              <div className='instruction-body'>
                <h4><b>To edit profile setting:</b></h4>
                <ol>
                  <li>Navigate to the 'User Profle' page</li>
                  <li>Click on the setting icon</li>
                  <li>Click on 'debt tracking'</li>
                </ol>
                
                <h4><b>To pay all debt owed to a specific person：</b></h4>
                <ol>
                  <li>Navigate to Homepage</li>
                  <li>Under "Tasks to do!", search that specific person</li>
                  <li>Click on the paper money icon beside that person's name</li>
                  <li>Click on "Ok"</li>
                </ol>

                <h4><b>To pay a specific debt：</b></h4>
                <ol>
                  <li>Navigate to Homepage</li>
                  <li>Under "Outstanding Payments!", search that specific debt</li>
                  <li>Click on the paper money icon</li>
                  <li>Click on "Ok"</li>
                </ol>

                <h4><b>To chase payment from a particular friend:</b></h4>
                <ol>
                  <li>Navigate to Homepage</li>
                  <li>under the 'Chase people who still owes you', click on the 'Chase payment' button</li>
                  <li>A message notification will be sent to your group chat to inform him/her</li>
                </ol>
                
                <h4><b>To create group chat:</b></h4>
                <ol>
                  <li>Navigate to the 'Community Groups' page</li>
                  <li>Add group name</li>
                  <li>Click on Ccreate' to create group</li>
                </ol>

                <h4><b>To join a group chat your friend has created:</b></h4>
                <ol>
                  <li>Navigate to the 'Community Groups' page</li>
                  <li>Key in the group verification code your friend send you</li>
                  <li>Click on 'join' group</li>
                </ol>
                
                <h4><b>To create split-bill expenditure for a specific group:</b></h4>
                <ol>
                  <li>Navigate to the 'Community Groups' page</li>
                  <li>Select that specific community group</li>
                  <li>Click on the calculator icon</li>
                  <li>Add in expenditure details</li>
                  <li>Click "Calculate"</li>
                  <li>Click "Send bill summary to group"</li>
                </ol>

                <h4><b>To view debt tracking records for a specific group:</b></h4>
                <ol>
                  <li>Navigate to the 'Community group' page. Open that specific group chat</li>
                  <li>Click on the setting icon</li>
                  <li>Click on 'debt tracking'</li>
                </ol>

                <h4><b>To add individual expenditure:</b></h4>
                <ol>
                  <li>Navigate to the 'Expenditure Tracker' page</li>
                  <li>Under the 'Transaction history' section, Click on the icon "Add Expenditure"</li>
                  <li>Key in expenditure details</li>
                  <li>Scroll down, click 'save'</li>
                  <li>The expenditure record will be shown on the transaction history</li>
                </ol>

                <h4><b>To delete group split bill expenditure records or individual expenditure records:</b></h4>
                <ol>
                  <li>Navigate to the 'Expenditure Tracker' page</li>
                  <li>nder the 'Transaction History' section, search for the record you want to delete</li>
                  <li>Click on the red cancel icon to delete record</li>
                  <li>The expenditure record will be cleared/erase</li>
                  <li>Note that if it is the group expenditure record, it will be erased from the group chat</li>
                </ol>

                <h4><b>To set budget:</b></h4>
                <ol>
                  <li>Navigate to the 'Expenditure Tracker' page</li>
                  <li>Under 'Transaction History', click on the coins icon</li>
                  <li>Set personal Budget and click on 'Save'</li>
                </ol>

                <h4><b>To change profile picture:</b></h4>
                <ol>
                  <li>Navigate to the 'User Profile' page</li>
                  <li>Click on 'Edit profile setting'</li>
                  <li>Set random seed</li>
                  <li>Click 'Save'</li>
                </ol>
              </div> 
            </div>
            <br/>
            <div className='btn-close-box'>
              <button className='btn-close' onClick={() => {setIsGuideOpen(false)}}>Close</button>
            </div>
            
          </div>
          
        </div> 
        
        : 
        <div>
          
        </div>}
      <FooterSection />
      
    </div>

    );
}
export default HomePage; 