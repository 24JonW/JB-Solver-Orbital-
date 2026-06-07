import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import { jwtDecode } from 'jwt-decode'; 

import JBSolverLogo from '../assets/JBSolverLogo.png';
import communityGroup from '../assets/communityGroup.png';
import expenseTracker from '../assets/expenditureTracker96.png'; 
import userProfile from '../assets/user96.png';
import home from '../assets/home.png';
import '../App.css'; 


function CommunityGroups() {
  const navigate = useNavigate();
  //Core status 
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState([]); 
  const [selectedGroup, setSelectedGroup]= useState(null); 
  const [messages, setMessages]= useState([]); 
  const [newMessage, setNewMessage]= useState(""); 

  //Form input states
  const [newGroupName, setNewGroupName] = useState(""); 
  const [joinGroupId, setJoinGroupId]= useState(""); 

  //View group members 
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);

   
    

  const API_BASE_URL= 'http://localhost:5001/api/groups'; 

  //Get user identity from localStorage token on mount
  useEffect(()=> {
    const token= localStorage.getItem('token');
    if (!token) {
      navigate('/'); 
      return;
    }
    try {
      const decoded= jwtDecode(token);
      //backend signs user with: { id: user.user_id, username: user.username } 
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

  useEffect(()=> {
    if (currentUser) {
      fetchGroupList(); 

    }
  }, [currentUser]);

    //Keep updating live chat window messages periodically if a group is open
  useEffect(()=> {
    if (!selectedGroup) return; 
    fetchGroupMessages(selectedGroup.group_id); 
    // 2. Set up a background interval to fetch updates every 3000ms (3 seconds)
    const pollInterval = setInterval(() => {
      fetchGroupMessages(selectedGroup.group_id);
    }, 3000);

    // 3. CRITICAL CLEANUP: Clear interval when switching groups or leaving page
    return () => clearInterval(pollInterval);

  }, [selectedGroup]);


    //API interactions
  const fetchGroupList= async ()=> {
    try {
      const response= await axios.get(`${API_BASE_URL}/user/${currentUser.user_id}`);
      if (Array.isArray(response.data)) {
        setGroups(response.data); 
       } 
    } catch (err) {
      console.error("Error loading groups: ", err); 
    }
  };

  const fetchGroupMessages= async (groupId) => {
    try {
      const response= await axios.get(`${API_BASE_URL}/${groupId}/messages`); 
      if (Array.isArray(response.data)) {
        setMessages(response.data);
      }
    } catch (err) {
      console.error("Error downloading messages stream: ". err);
    }
  };

  const handleCreateGroup = async (e)=> {
    e.preventDefault(); 
    if (!newGroupName.trim()) return; 
    try {
      const response= await axios.post(`${API_BASE_URL}/create`, {
        groupName: newGroupName, 
        userId: currentUser.user_id
      })
      if (response.status === 201) {
        setNewGroupName(""); 
        fetchGroupList(); 
      }
    } catch (err) {
      console.error("Failed creating chat room:", err);
    }
  };

  const handlejoinGroup = async (e)=> {
    e.preventDefault(); 
    if (!joinGroupId.trim()) return; 
    try {
      const response = await axios.post(`${API_BASE_URL}/join`, {
        groupId: parseInt(joinGroupId), 
        userId: currentUser.user_id
      })
      if (response.status=== 201) {
        setJoinGroupId(""); 
        alert(`Successfully joined: ${response.data.group.group_name}`); 
        fetchGroupList(); 
      }

    } catch (err) {
      alert(err.response?.data?.error || "Failed to locate or join group.");
          console.error(err);
    }
  }

  const handleSendMessage= async (e) => {
    e.preventDefault(); 
    if (!newMessage.trim() || !selectedGroup) return;
    try {
      const response= await axios.post(`${API_BASE_URL}/message`, {
        groupId: selectedGroup.group_id,
        senderId: currentUser.user_id,
        messageText: newMessage
      }); 
      if (response.status=== 201) {
        setNewMessage(""); 
        fetchGroupMessages(selectedGroup.group_id); 
        // setMessages(prevMessages => [...prevMessages, response.data]);
      }
    } catch (err) {
      console.error("Message send failure:", err);
    }

  }; 

  const fetchGroupMembers= async (groupId)=> {
    // e.preventDefault(); 
    try {
      const response= await axios.get(`${API_BASE_URL}/${groupId}/members`); 
      if (Array.isArray(response.data)) {
        setGroupMembers(response.data);
        setShowMembersModal(true);
      }

    } catch (err) {
      console.error("Failed to show group memebers list", err);
    }
  }

  if (!currentUser) return null; 


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

      <div className="chat-app-layout">
        {/* Right Side: Create/join group, list of groups joined by users */}
        <div className= "chat-sidebar"> 
          <div className= "management-forms"> 
            <form onSubmit = {handleCreateGroup} className= "side-form"> 
              <input 
                type ="text"
                placeholder='New Group Name'
                value = {newGroupName}
                onChange= {(e)=> setNewGroupName(e.target.value)}
              />
              <button type= "submit" className= "action-btn"> Create</button>
            </form>
            <form onSubmit = {handlejoinGroup} className= "side-form">
              <input 
                type= "number"
                placeholder= "Enter Group ID"
                value= {joinGroupId}
                onChange = {(e)=> setJoinGroupId(e.target.value)}
              
              /> 
              <button type="submit" className="action-btn structural">Join</button>
            </form>

          </div>
        
          <div className= "group-roster-list"> 
            <h3> My Chat Rooms</h3>
            {groups.map((group)=> (
              <div 
                key = {group.groupId}
                className= {`roster-item ${selectedGroup?.group_id === group.group_id ? 'active-room' : ''}`}
                onClick= {()=> setSelectedGroup(group)}
              > 
                <div className="avatar-placeholder">👥</div>
                <div className="roster-details">
                  <h4>{group.group_name}</h4>
                  <p>ID: {group.group_id}</p>
                </div>
                
              </div> 
            ))}
          </div>
        </div>
        {/* Left Side: Conversation Content Space */}
        <div className="chat-window-pane">
          {selectedGroup ? (
            <div className="active-chat-container">
              <div className="chat-header-title">
                <h3>{selectedGroup.group_name} <span className="id-badge">(ID: {selectedGroup.group_id})</span></h3>
                <button onClick= {()=> fetchGroupMembers(selectedGroup.group_id)} className= "view-members-btn"> View group members</button>
                
              </div>
              <div className="messages-stream">
                {messages.map((msg) => (
                  <div 
                    key={msg.message_id} 
                    className={`chat-bubble ${msg.sender_id === currentUser.user_id ? 'outgoing' : 'incoming'}`}
                  >
                    <span className="bubble-sender">{msg.username}</span>
                    <p className="bubble-text">{msg.message_text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="chat-input-bar">
                  <input 
                      type="text" 
                      placeholder="Type a message..." 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)} 
                  />
                  <button type="submit" className="send-btn">Send</button>
              </form>
            </div>
          ) : (
            <div className="empty-chat-state">
                <div className="prompt-illustration">💬</div>
                <h3>Select a group chat room from the sidebar menu to start messaging!</h3>
            </div>
          )}
          {showMembersModal && (
            <div className="modal-backdrop" onClick={() => setShowMembersModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Members of {selectedGroup?.group_name}</h3>
                  <button className="close-modal-btn" onClick={() => setShowMembersModal(false)}>×</button>
                </div>
                  <div className="modal-body">
                    <p className="member-count">{groupMembers.length} members</p>
                    <div className="members-list">
                    {groupMembers.map((member) => (
                      <div key={member.user_id} className="member-item">
                        <div className="member-avatar">👤</div>
                        <div className="member-info">
                          <span className="member-name">
                            {member.username} {member.user_id === currentUser.user_id && <span className="you-badge">(You)</span>}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

export default CommunityGroups;