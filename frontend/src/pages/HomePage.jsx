import { useNavigate } from 'react-router-dom';
import '../App.css';

import JBSolverLogo from '../assets/JBSolverLogo.png'; 
import communityGroup from '../assets/communityGroup.png';
import expenseTracker from '../assets/expenditureTracker96.png';
import userProfile from '../assets/user96.png';
import picture from '../assets/picture.png'; 
import home from '../assets/home.png';
import {useState, useEffect} from 'react'; 
import axios from 'axios'; 

function HomePage() {
  const navigate = useNavigate();
  const [email, setEmail]= useState(''); 
  const [userId, setUserId]= useState(null); 
  const [username, setUsername] = useState(''); 

  const API_BASE_URL= 'http://localhost:5001/api/accounts'; 

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

  })


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
              <img src={home} className="expense-img" />
            </button>
            <span className="hover-tooltip">Home Page</span>
          </div>
          <div className="button-wrapper">
            <button
              className="expenditureTracker"
              onClick={() => navigate("/tracker")}
            >
              <img src={expenseTracker} className="expense-img" />
            </button>
            <span className="hover-tooltip">Expenditure Tracker</span>
          </div>

          <div className="button-wrapper">
            <button
              className="communityGroupButton"
              onClick={() => navigate("/groups")}
            >
              <img src={communityGroup} className="group-img" />
            </button>
            <span className="hover-tooltip">Community Groups</span>
          </div>

          <div className="button-wrapper">
            <button
              className="userProfileButton"
              onClick={() => navigate("/profile")}
            >
              <img src={userProfile} className="userProfile-img" />
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
                  <h2>Logged In User</h2>
                  <p>Community Member</p>
              </div>
          </div>
          <div className='profile-details'>
              <p><strong>Email:</strong> {email}</p>
              <p><strong>ID:</strong> {userId}</p>
              <p><strong>Username: </strong>{username} </p>
          </div>
          <button className='edit-profile-btn'>
              Edit Profile
          </button>
          
        </div>
        <div className='profile-card' style={{ gridArea: 'box2'}}>
          <h2>Tasks to do</h2>
          
        </div>

        <div className='profile-card' style={{ gridArea: 'box3'}}>
          <h2>Achievements</h2>
          
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