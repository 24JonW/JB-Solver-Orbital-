import { useNavigate } from 'react-router-dom';
import '../App.css';

import JBSolverLogo from '../assets/JBSolverLogo.png'; 
import picture from '../assets/picture.png'; 
import {useState, useEffect} from 'react'; 
import axios from 'axios'; 

import { GiHouse } from "react-icons/gi";
import { FaUserCircle } from "react-icons/fa";
import { FaUsersGear } from "react-icons/fa6";
import { ImStatsDots } from "react-icons/im";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import { GiPartyPopper } from "react-icons/gi";

function HomePage() {
  const navigate = useNavigate();
  const [email, setEmail]= useState(''); 
  const [userId, setUserId]= useState(null); 
  const [username, setUsername] = useState(''); 
  const [outstandingLedger, setOutstandingLedger]= useState([]);


  const API_BASE_URL= 'http://localhost:5001/api/accounts'; 
  const API_BILLS_URL= 'http://localhost:5001/api/bills'; 

  

  useEffect(()=> {
    const storedUserId= localStorage.getItem('userId'); 
    if (!storedUserId) {
      navigate('/'); 
      return; 
    }
    axios.get(`${API_BASE_URL}/${storedUserId}`)
      .then((res)=> {
        const data= res.data; 
        setEmail(data.email);
        setUserId(data.user_id);
        setUsername(data.username);
      })
      .catch((err)=> {
        console.error('Error fetching user profile with Axios:', err);
      })
    axios.get(`${API_BILLS_URL}/outstanding/${storedUserId}`)
      .then((res)=> {
        if (Array.isArray(res.data)) {
          setOutstandingLedger(res.data)
        }
      }).catch((err)=> {
        console.error('Error fetching outstanding payments:', err);
      })

  }, [navigate]); 

  const handleSettleHomeShare = (shareId) => {
    axios.post(`${API_BILLS_URL}/settle-share`, { shareId })
      .then(() => {
        // Optimistically remove the item from local display array
        setOutstandingLedger(prev => prev.filter(item => item.share_id !== shareId));
        alert("Payment settled successfully!");
      })
      .catch((err) => console.error("Error settling payment:", err));
  };


  return (
    <div className="homepage-container">
      
      <div className="topSectionBar">
        <img src={JBSolverLogo} className="logo-img" />

        <div className="right-buttons-4">
          <div className="button-wrapper">
            <button
              className="homepageButton"
              onClick={() => navigate("/home")}
            >
              <GiHouse size={45} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">Home Page</span>
          </div>
          <div className="button-wrapper">
            <button
              className="expenditureTracker"
              onClick={() => navigate("/tracker")}
            >
              <ImStatsDots size={45} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">Expenditure Tracker</span>
          </div>

          <div className="button-wrapper">
            <button
              className="communityGroupButton"
              onClick={() => navigate("/groups")}
            >
              <FaUsersGear size={45} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">Community Groups</span>
          </div>

          <div className="button-wrapper">
            <button
              className="userProfileButton"
              onClick={() => navigate("/profile")}
            >
              <FaUserCircle size={45} color={'#edb601'}/>
            </button>
            <span className="hover-tooltip">User Profile</span>
          </div>
        </div>
      </div>
      

      <div className='home-body'>
        <div className='profile-card'>
          <div className='profile-header'>
              <img src={picture} className='profilePicture-img' />
              <div className='profile-main-info'>
                  <h2>Username: {username}</h2>
                  {/* <p>Community Member</p> */}
              </div>
          </div>
          <div className='profile-details'>
              <p><strong>Email:</strong> {email}</p>
              <p><strong>ID:</strong> {userId}</p>
          </div>
          <button className='edit-profile-btn' onClick= {()=> {
            navigate("/profile");
          }}>
              Edit Profile
              
              
          </button>
          
        </div>
        <div className='profile-card' style={{ gridArea: 'box2'}}>
          <h2>Tasks to do</h2>
          
        </div>

        {/* 4. Updated Outstanding Payments UI block */}
        <div className='profile-card' style={{ gridArea: 'box3', display: 'flex', flexDirection: 'column' }}>
          <h2>Outstanding Payments </h2>
          <div className="home-debt-scroll-container" style={{ flex: 1, overflowY: 'auto', marginTop: '10px', textAlign: 'left' }}>
            {outstandingLedger.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#667781', marginTop: '20px' }}>
                <GiPartyPopper size={45} color={'#edb601'}/> No pending payments. Your balance is completely clear!
              </p>
            ) : (
              outstandingLedger.map((item) => (
                <div key={item.share_id} className="home-ledger-row" style={{ padding: '10px 0', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{item.description}</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>
                      You owe <strong>{item.creditor_name}</strong>
                    </p>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#dc2626' }}>
                      {item.currency} {parseFloat(item.amount_owed).toFixed(2)}
                    </span>
                  </div>
                  <div className= "button-wrapper"> 
                  <button 
                    className="homePageSettleButton" 
                    style={{ margin: 0, padding: '6px 12px', fontSize: '14px' }}
                    onClick={() => handleSettleHomeShare(item.share_id)}
                  >
                    <FaMoneyBillTransfer size={45} color={'green'}/>
                  </button>
                  <span className="hover-tooltip">Settle</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
      <div className='footer'>
        <button className='btn-logout' onClick={() => {
          localStorage.removeItem('userId')
          navigate('/')
        }}>
            Log Out
        </button>
      </div>




    </div>

    );
}
export default HomePage; 