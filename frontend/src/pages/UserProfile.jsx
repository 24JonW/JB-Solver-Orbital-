import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import JBSolverLogo from '../assets/JBSolverLogo.png';
import '../App.css'; 
import '../userProfile.css';

import { GiHouse } from "react-icons/gi";
import { FaUserCircle } from "react-icons/fa";
import { FaUsersGear } from "react-icons/fa6";
import { ImStatsDots } from "react-icons/im";
import { MdOutlineMail } from "react-icons/md";
import { TbUserHexagon } from "react-icons/tb";
import { RiLockPasswordLine } from "react-icons/ri";



function UserProfile() {
  const navigate = useNavigate(); 
  const [email, setEmail]= useState(''); 
  const [userId, setUserId]= useState(null); 
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); 
  const [newPassword, setNewPassword]= useState('');

  //UI Interactive states
  const [isEditing, setIsEditing] = useState(false); 
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // const API_BASE_URL= 'http://localhost:5001/api/accounts'; 
  const API_BASE_URL = 'https://jb-solver-orbital.onrender.com/api/accounts';

  

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

        setEditUsername(data.username); 
        setEditEmail(data.email);
      })
      .catch((err)=> {
        console.error('Error fetching user profile with Axios:', err);
      })
    // Data Fetching: Gather all unpaid split bill transactions matching this specific user ID
  }, [navigate]);

  const handleProfileUpdateToggle = async ()=> {
    if (!isEditing) {
      setIsEditing(true);
    } else {
      if (!editEmail.trim() || !editUsername.trim()) {
        alert("Fields cannot be empty"); 
        return;
      }
      try {
        const response = await axios.put(`${API_BASE_URL}/${userId}`, {
          username: editUsername,
          email: editEmail, 
          currentPassword: currentPassword, 
          newPassword: newPassword
        })
        if (response.status === 200) {
          setUsername(editUsername);
          setEmail(editEmail);
          setIsEditing(false); // Close edit view mode loop

          setCurrentPassword('');
          setNewPassword('');
          alert("Profile updated successfully!");

        }

      } catch (err) {
        console.error("Failed to update account metrics:", err);
        alert(err.response?.data?.error || "Update execution error.");

      }
    }
  }

  const handleDeleteAccount= async () => {
    const firstConfirm= window.confirm("Are you absolutely sure you want to delete your JBSolver account? This action cannot be undone."); 
    if (!firstConfirm) return;
    const secondConfirm = window.confirm("Warning: You will lose access to all group chats, ledgers, and expense tracking histories permanently. Confirm final termination?");
    if (!secondConfirm) return;
    try {
      const response= await axios.delete(`${API_BASE_URL}/${userId}`); 
      if (response.status === 200) {
        alert("Your account has been deleted successfully. Goodbye!");
        localStorage.removeItem('userId');
        localStorage.removeItem('token');
        navigate('/');
      }

    } catch (err) {
      console.error("Account deletion execution failure:", err);
      alert(err.response?.data?.error || "Failed to process account deletion request.");

    }

  }

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

      <div className='home-body-userProfile'>

        <div className= 'body-item-userProfile box1'> 
          
        </div>
        <div className= 'body-item-userProfile box2'> 
          <div className= "userProfileInfo"> 
            <h2> User account details</h2>
            <p>User Id:  {userId}</p>
            <div style= {{margin: '15px 0'}}>
              <MdOutlineMail size={20} /> <br/>
              <strong>email: </strong>
              
              <br/>
              {isEditing ? (
                <input 
                  type= "email"
                  value= {editEmail}
                  onChange={(e)=> setEditEmail(e.target.value)}
                  style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              ): (
                <span> {email} </span>
              )}
            </div>
            <div style= {{margin: '15px 0'}}> 
              <TbUserHexagon size={20}/> <br/>
              <strong>username: </strong>
              
              <br/>
              {isEditing ? (
                <input 
                  type= "text"
                  value={editUsername}
                  onChange={(e)=> setEditUsername(e.target.value)}
                  style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                />

              ): (
                <span> {username}</span>
              )}

            </div>
            {isEditing && (
              <div> 
                <RiLockPasswordLine size={20}/> <br/>
                <p className= "setPasswordNotification"> 
                  Leave password fields blank if you don't wish to change it.
                </p>
                <div className="passwordSection"> 
                  <strong>Current Password: </strong>
                  <br/>
                  <input 
                    type= "password"
                    value= {currentPassword}
                    onChange= {(e)=> setCurrentPassword(e.target.value)}
                    placeholder= "Enter current password"
                    style= {{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', marginLeft: '5px'}}
                  />
                </div>
                <div className= "passwordSection"> 
                  <strong>New Password: </strong>
                  <br/>
                  <input 
                    type= "password"
                    value= {newPassword}
                    onChange= {(e)=> setNewPassword(e.target.value)}
                    placeholder='Enter new password'
                    style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', marginLeft: '5px' }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className= "infoChangeSection"> 
            <button className= "editProfileButton" onClick= {handleProfileUpdateToggle}> 
              {isEditing ? 'Save': 'Edit profile setting'}
            </button>

            {isEditing ? (
              // Cancel button if user changes mind
              <button 
                className="deleteProfileButton" 
                style={{ backgroundColor: 'gray' }} 
                onClick={() => {
                  setEditUsername(username); // Reset tracking values
                  setEditEmail(email);
                  setIsEditing(false);        // Close input mode
                }}
              >
                Cancel
              </button>
            ) : (
              <button className="deleteProfileButton" onClick= {handleDeleteAccount}>Delete user account</button>
            )}
          </div>
        </div>
        <div className= 'body-item-userProfile box3'> 
          
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

export default UserProfile;