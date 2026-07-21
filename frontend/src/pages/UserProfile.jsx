import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import JBSolverLogo from '../assets/JBSolverLogo.png';
import '../App.css'; 
import '../userProfile.css';

import { TopSectionBar } from './TopSectionBar'; 
import { FooterSection } from './FooterSection';
import { FaUserCircle } from "react-icons/fa";
import { RiLockPasswordLine } from "react-icons/ri";
import { MdEmail } from "react-icons/md";
import { FaIdCard } from "react-icons/fa";
import { FcLock } from "react-icons/fc";
import { FcHighPriority } from "react-icons/fc";
import { FcCommandLine } from "react-icons/fc";
import { GiSeedling } from "react-icons/gi";

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

  //Avatar customization states 
  const [avatarSeed, setAvatarSeed]= useState('32');
  const [editSeed, setEditSeed]= useState('32');

  const API_BASE_URL= 'http://localhost:5001/api/accounts'; 
  // const API_BASE_URL = 'https://jb-solver-orbital.onrender.com/api/accounts';

  

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

        //Load stored avatar
        const initialSeed= data.avatar_seed || '32'; 
        setAvatarSeed(initialSeed); 
        setEditSeed(initialSeed);

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
          newPassword: newPassword, 
          avatar_seed: editSeed
        })
        if (response.status === 200) {
          setUsername(editUsername);
          setEmail(editEmail);
          setIsEditing(false); // Close edit view mode loop
          setAvatarSeed(editSeed);

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
  const currentAvatarUrl= `https://api.dicebear.com/9.x/big-smile/svg?seed=${encodeURIComponent(isEditing ? editSeed : avatarSeed)}`;

  return (
    <div className="homepage-container">
      <TopSectionBar/>

      <div className='home-body-userProfile'>

        <div className= 'body-item-userProfile box1'> 
          
        </div>
        <div className= 'body-item-userProfile box2'> 
          <div className= "userProfileInfo"> 
            <div> 
              {isEditing ? (
                <div className= "avatarDivision"> 
                  <img 
                    src= {currentAvatarUrl}
                    alt= "Avatar Design"
                    style={{ width: '150px', height: '150px', borderRadius: '50%', border: '4px solid #edb601', backgroundColor: '#f0f0f0' }}
                  />
                  <div className='divider2-box'>
                    <GiSeedling size={45} style={{ color: '#edb601'}}/>
                    <span style={{marginTop:'10px', fontSize:'20px', marginLeft:'7px'}}> <strong> Set random seed: </strong> </span>
                  </div>
                  
                  <input 
                    type= "text"
                    value= {editSeed}
                    onChange= {(e)=> setEditSeed(e.target.value)}
                    placeholder= "change phrase to randomize layout"
                    style= {{padding: '7px', borderRadius: '4px', border: '1px solid #ccc', width: '80%', marginTop:'10px'}}
                  />
                </div> 
              ) : (
                <div className= "avatarDivision"> 
                  <img 
                    src= {currentAvatarUrl}
                    alt= "Avatar Design"
                    style={{ width: '150px', height: '150px', borderRadius: '50%', border: '4px solid #edb601', backgroundColor: '#f0f0f0' }}
                  />
                  {/* <span> <strong> Seed </strong>: {avatarSeed} </span> */}
                </div>


              )}

            </div>
            
            <h2 className='userprofile-details' style={{marginTop:'-10px'}}><b>User account details</b></h2>
            {!isEditing ? (
              <div className='divider-box'>
                <div className='divider2-box'>
                   <FaIdCard size={30} style={{ color: '#edb601'}}/>
                   <p className='divider-title'><b>User Id:</b> </p>
                </div>
                <p>{userId}</p>
            </div>
            ) : <div/>}
            
            <div className='divider-box' style= {{margin: '15px 0'}}>
              <div className='divider2-box'>
                <MdEmail size={32} style={{ color: '#f49a50'}}/>
                <p className='divider-title'><b>Email:</b></p>
              </div>
              
              
              {isEditing ? (
                    <input 
                      type= "email"
                      value= {editEmail}
                      onChange={(e)=> setEditEmail(e.target.value)}
                      style={{ padding: '7px', borderRadius: '4px', border: '1px solid #ccc', width:'80%', marginTop: '10px'}}
                    />
                  ): (
                    <span> {email} </span>
                  )}
            </div>
            <div className='divider-box' style= {{margin: '15px 0'}}> 
              <div className='divider2-box'>
                  <FaUserCircle size={32} style={{ color: '#d27162'}}/>
                  <p className='divider-title'><b>Username:</b></p>
              </div>    
      
                {isEditing ? (
                  <input 
                    type= "text"
                    value={editUsername}
                    onChange={(e)=> setEditUsername(e.target.value)}
                    style={{ padding: '7px', borderRadius: '4px', border: '1px solid #ccc', width:'80%', marginTop: '10px'}}
                  />

                ): (
                  <span> {username}</span>
                )}
            </div>
            {isEditing && (
              <div> 
                
                <div className='warning-line'>
                  <FcHighPriority className='warning-logo' size={20}/>
                  <p className= "setPasswordNotification" style={{color:'red', fontWeight:'bold' }}> 
                    Leave password fields blank if you don't wish to change it.
                  </p>
                </div>
                
                <div className="passwordSection"> 
                  <strong style={{fontSize: '22px'}}>Current Password: </strong>
                  <br/>
                  <input 
                    type= "password"
                    value= {currentPassword}
                    onChange= {(e)=> setCurrentPassword(e.target.value)}
                    placeholder= "Enter current password"
                    style= {{padding: '7px', borderRadius: '4px', border: '1px solid #ccc', marginLeft: '5px', width:'80%', marginTop: '12px'}}
                  />
                </div>
                <div className= "passwordSection"> 
                  <strong style={{fontSize: '22px'}}>New Password: </strong>
                  <br/>
                  <input 
                    type= "password"
                    value= {newPassword}
                    onChange= {(e)=> setNewPassword(e.target.value)}
                    placeholder='Enter new password'
                    style={{ padding: '7px', borderRadius: '4px', border: '1px solid #ccc', marginLeft: '5px', width:'80%', marginTop: '12px'}}
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
                onClick={() => {
                  setEditUsername(username); // Reset tracking values
                  setEditEmail(email);
                  setIsEditing(false);        // Close input mode
                  setEditSeed(avatarSeed);
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
      <FooterSection/>
    </div>

    );
  }

export default UserProfile;