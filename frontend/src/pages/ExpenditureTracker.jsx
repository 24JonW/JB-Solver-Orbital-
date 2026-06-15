
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react'; 
import axios from 'axios'; 
import JBSolverLogo from '../assets/JBSolverLogo.png';
import { jwtDecode } from 'jwt-decode'; 

import '../App.css'; 
import '../ExTracker.css'; 
import { GiHouse } from "react-icons/gi";
import { FaUserCircle } from "react-icons/fa";
import { FaUsersGear } from "react-icons/fa6";
import { ImStatsDots } from "react-icons/im";


function ExpenditureTracker() {
  const navigate = useNavigate();
  const [ ledger, setLedger ] = useState([]); 
  const [currentUser, setCurrentUser] = useState(null);


  const API_EXP_URL = 'http://localhost:5001/api/exp';
  useEffect(()=> {
      const token= localStorage.getItem('token');
      if (!token) {
        navigate('/'); 
        return;
      }
      try {
        const decoded= jwtDecode(token);
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
        setLedger(res.data)
      } 

    })
    .catch(err => console.error(err)); 
  }, [currentUser]
  );

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

    
      <div className='home-body-ex'>
        <div className='card' style={{gridArea: 'box-1'}}>
            Budget this month
        </div>

        <div className='card' style={{gridArea: 'box-2'}} >
            Expenditure this month
        </div>

        <div className='card' style={{gridArea: 'box-3'}}>
            Comparison with prev month
        </div>
        <div className='card' style={{gridArea: 'box-4'}}> 
            Remaining Budget
        </div>
        
        <div className='card' style={{gridArea: 'box-5'}}>
            Spending Trend Line Graph 
        </div>
        <div className='card' style={{gridArea: 'box-6'}}>
            Category Breakdown Pie Chart 
        </div>
        <div className='card' style={{gridArea: 'box-7'}}>
            <h3>Transaction History</h3>
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
                    <hr/>
                  </div>
                ))}
              </div>
            )}
        </div>

      </div>

      <div className='footer'>
        <button className='btn-logout' onClick={() => navigate('/')}>
            Log Out
        </button>
      </div>




    </div>

    );
}

export default ExpenditureTracker;