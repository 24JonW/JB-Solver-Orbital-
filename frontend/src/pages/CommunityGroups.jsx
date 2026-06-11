import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import { jwtDecode } from 'jwt-decode'; 

import JBSolverLogo from '../assets/JBSolverLogo.png';
import communityGroup from '../assets/communityGroup.png';
import expenseTracker from '../assets/expenditureTracker96.png'; 
import userProfile from '../assets/user96.png';
import home from '../assets/home.png';
import messageBubble from '../assets/chatMessage.png';
import groupChatIcon from '../assets/groupChatIcon.png';
import '../App.css'; 
import SmartSplitCalculator from './SmartSplitCalculator';
//images
import { Cog } from 'lucide-react'; 
import { X } from 'lucide-react'; 
import { Calculator } from 'lucide-react'; 

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

  // show settings modal 
  const [ showSettingsMenu, setShowSettingsMenu ] = useState(false); 
  //show debt tracking modal 
  const [showDebtTrackingModal, setShowDebtTrackingModal] = useState(false); 
  // show calcualtor modal 
  const [ showCalculatorModal, setShowCalculatorModal ] = useState(false); 

  // Ledger state for Debt Tracking
  const [ledger, setLedger] = useState([]);

  const API_BASE_URL= 'http://localhost:5001/api/groups'; 
  const API_BILLS_URL= 'http://localhost:5001/api/bills';

  //Get user identity from localStorage token on mount
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

  useEffect(()=> {
    if (currentUser) {
      fetchGroupList(); 
    }
  }, [currentUser]);

  // Combined real-time message stream polling rule
  useEffect(()=> {
    if (!selectedGroup) return; 

    // Fetch instantly on room select
    fetchGroupMessages(selectedGroup.group_id); 
    
    axios.get(`${API_BASE_URL}/${selectedGroup.group_id}/members`)
      .then(res => {
        if (Array.isArray(res.data)) {
          setGroupMembers(res.data);
        }
      })
      .catch(err => console.error(err));
    
    // Set up background poll safely
    const pollInterval = setInterval(() => {
      fetchGroupMessages(selectedGroup.group_id);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [selectedGroup]);

  // Fetch group ledger when debt tracking modal opens
  useEffect(() => {
    if (showDebtTrackingModal && selectedGroup) {
      fetchLedger();
    }
  }, [showDebtTrackingModal, selectedGroup]);

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
      console.error("Error downloading messages stream:", err);
    }
  };

  const fetchLedger = async () => {
    try {
      const response = await axios.get(`${API_BILLS_URL}/ledger/${selectedGroup.group_id}`);
      if (Array.isArray(response.data)) {
        setLedger(response.data);
      }
    } catch (err) {
      console.error("Error fetching group ledger:", err);
    }
  };

  const handleSettleShare = async (shareId) => {
    try {
      const response = await axios.post(`${API_BILLS_URL}/settle-share`, { shareId });
      if (response.status === 200) {
        alert("Payment settled successfully!");
        fetchLedger(); 
      }
    } catch (err) {
      console.error("Failed to settle share context target:", err);
      alert("Failed to clear ledger record.");
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

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    const confirmDelete= window.confirm(
      `Are you sure you want to permanently delete "${selectedGroup.group_name}"? This action cannot be undone.`
    )
    if (!confirmDelete) return; 

    try {
      const response = await axios.post(`${API_BASE_URL}/delete`,{
        groupId: selectedGroup.group_id, 
        userId: currentUser.user_id
      });
      if (response.status===(200)) {
        alert("Group successfully deleted"); 
        setSelectedGroup(null); 
        setMessages([]); 
        fetchGroupList();
      }
    } catch (err) {
      console.error("Failed to delete group", err);
      alert(err.response?.data?.error || "Failed to delete group.");
    }
  }

  const handleLeaveGroup= async ()=> {
    if (!selectedGroup) return; 
    if (groupMembers.length == 1) {
      alert("You are the last member of this group. Leaving will permanently delete the group.");
      handleDeleteGroup(); 
      return; 
    }

    const confirmDelete= window.confirm(
      `Are you sure you want to leave "${selectedGroup.group_name} group"? This action cannot be undone.`
    )
    if (!confirmDelete) return; 
    try {
      const response= await axios.post(`${API_BASE_URL}/leave`, {
        groupId: selectedGroup.group_id, 
        userId: currentUser.user_id
      }) 
      if (response.status=== 200) {
        alert(`You have successfully left "${selectedGroup.group_name}".`); 
        setSelectedGroup(null); 
        setMessages([]);
        fetchGroupList();
      }
    } catch (err) {
      console.error("Failed to leave group", err); 
      alert(err.response?.data?.error || "Failed to leave group."); 
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
      }
    } catch (err) {
      console.error("Message send failure:", err);
    }
  }; 

  const fetchGroupMembersList= async (groupId)=> {
    try {
      const response= await axios.get(`${API_BASE_URL}/${groupId}/members`); 
      if (Array.isArray(response.data)) {
        setGroupMembers(response.data);
        setShowMembersModal(true);
      }
    } catch (err) {
      console.error("Failed to show group members list", err);
    }
  }

  const handleClearHistory = async () => {
    if (!selectedGroup) return; 
    const confirmed = window.confirm('Delete all paid debt records?'); 
    if (!confirmed) return; 
    try {
      await axios.post(`${API_BILLS_URL}/clear-history`, {
        groupId: selectedGroup.group_id
      });
      fetchLedger(); 
      alert('Paid history cleared successfully'); 
    } catch (err) {
      console.error(err); 
      alert('Failed to clear history');
    }
    
  }

  const handleFilterForYou = async () => {
    
    const filtered = ledger.filter(i => i.debtor_user_id === currentUser.user_id || i.creditor_user_id === currentUser.user_id);
    setLedger(filtered); 
  }

  const handleCancelFilter = async () => {
    fetchLedger();
  }

  if (!currentUser) return null; 

  return (
    <div className="homepage-container">
      <div className="topSectionBar">
        <img src={JBSolverLogo} className="logo-img" />

        <div className="right-buttons-4">
          <div className="button-wrapper">
            <button className="homepageButton" onClick={() => navigate("/home")}>
              <img src={home} className="expense-img" />
            </button>
            <span className="hover-tooltip">Home Page</span>
          </div>
          <div className="button-wrapper">
            <button className="expenditureTracker" onClick={() => navigate("/tracker")}>
              <img src={expenseTracker} className="expense-img" />
            </button>
            <span className="hover-tooltip">Expenditure Tracker</span>
          </div>

          <div className="button-wrapper">
            <button className="communityGroupButton" onClick={() => navigate("/groups")}>
              <img src={communityGroup} className="group-img" />
            </button>
            <span className="hover-tooltip">Community Groups</span>
          </div>

          <div className="button-wrapper">
            <button className="userProfileButton" onClick={() => navigate("/profile")}>
              <img src={userProfile} className="userProfile-img" />
            </button>
            <span className="hover-tooltip">User Profile</span>
          </div>
        </div>
      </div>

      <div className="chat-app-layout">
        {/* Left Sidebar */}
        <div className="chat-sidebar"> 
          <div className="management-forms"> 
            <form onSubmit={handleCreateGroup} className="side-form"> 
              <input 
                type="text"
                placeholder='New Group Name'
                value={newGroupName}
                onChange={(e)=> setNewGroupName(e.target.value)}
              />
              <button type="submit" className="action-btn"> Create</button>
            </form>
            <form onSubmit={handlejoinGroup} className="side-form">
              <input 
                type="number"
                placeholder="Enter Group ID"
                value={joinGroupId}
                onChange={(e)=> setJoinGroupId(e.target.value)}
              /> 
              <button type="submit" className="action-btn structural">Join</button>
            </form>
          </div>
        
          <div className="group-roster-list"> 
            <h3> My Chat Rooms</h3>
            {groups.map((group)=> (
              <div 
                key={group.group_id}
                className={`roster-item ${selectedGroup?.group_id === group.group_id ? 'active-room' : ''}`}
                onClick={()=> setSelectedGroup(group)}
              > 
                <div className="avatar-placeholder">
                  <img src={groupChatIcon} className="groupChatIcon" />
                </div>
                <div className="roster-details">
                  <h4 style={{fontSize: '17px'}}>{group.group_name}</h4>
                  <p style={{fontSize:'15px'}}>ID: {group.group_id}</p>
                </div>
              </div> 
            ))}
          </div>
        </div>

        {/* Right Conversation Window */}
        <div className="chat-window-pane">
          {selectedGroup ? (
            <div className="active-chat-container">
              <div className="chat-header-title">
                <h3>{selectedGroup.group_name} <span className="id-badge">(ID: {selectedGroup.group_id})</span></h3>
                <div className='settings-container'>
                  <Calculator className='calculator-btn' onClick={() => setShowCalculatorModal(!showCalculatorModal)} size={35}/>
                  <Cog className='settings-btn' onClick={() => setShowSettingsMenu(!showSettingsMenu)} size={35}/>
                  
                  {showSettingsMenu && (
                    <div className='settings-popup'>
                      <button onClick={() => handleDeleteGroup()} className="delete-group-btn"> Delete Group</button>
                      <button onClick={() => fetchGroupMembersList(selectedGroup.group_id)} className="view-members-btn"> View group members</button>
                      <button onClick={() => handleLeaveGroup()} className="leave-group-btn"> Leave Group</button>
                      <button onClick={() => setShowDebtTrackingModal(true)} className='debt-tracking-btn'>Debt Tracking</button>
                      <X onClick={() => setShowSettingsMenu(false)} className='close-settings-btn'/>
                    </div>
                  )}

                  <SmartSplitCalculator
                    show={showCalculatorModal}
                    onClose={() => {
                      setShowCalculatorModal(false);
                      if (showDebtTrackingModal) fetchLedger(); 
                    }}
                    selectedGroup={selectedGroup}
                    currentUser={currentUser}
                    groupMembers={groupMembers}
                  />
                </div>
              </div>

              <div className="messages-stream">
                {messages.map((msg) => {
                  if (msg.sender_id === null) {
                    return (
                      <div key={msg.message_id} className="system-notification-pill"> 
                        <span> {msg.message_text}</span>
                      </div> 
                    )
                  }               
                  return (
                    <div 
                      key={msg.message_id} 
                      className={`chat-bubble ${msg.sender_id === currentUser.user_id ? 'outgoing' : 'incoming'}`}
                    >
                      <span className="bubble-sender">{msg.username}</span>
                      <p className="bubble-text">{msg.message_text}</p>
                    </div>
                  )
                })}
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
                <div className="prompt-illustration">
                <img src={messageBubble} className="messageBubble-img"/>
                </div>
                <h3>
                  Select a group chat room from the sidebar menu to start messaging!
                </h3>
            </div>
          )}

          {/* Members Modal */}
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

          {/* Debt Tracking Modal */}
          {showDebtTrackingModal && (
            <div className='modal-backdrop' onClick={() => setShowDebtTrackingModal(false)}>
              <div className='modal-content' onClick={(e) => e.stopPropagation()}>
                <div className='modal-header'>
                  <h3>Debt Tracking</h3>
                  <button className='close-modal-btn' onClick={() => setShowDebtTrackingModal(false)}>
                    <X size={20}/>
                  </button>
                </div>
                <div className='modal-body-dt'>
                    <div className= 'debtTrackerDescription'>
                      <p >Track debts and balances between group members</p>
                    </div>        
                    <div className= "multiplefilterButtons"> 
                      <button className= "filterButton" onClick={handleFilterForYou}>
                        Filter for 'You'
                      </button>
                      <button className= "cancelfilterButton" onClick={handleCancelFilter}>
                        Remove Filter
                      </button>
                      
                      <button className= "clearHistoryButton" onClick={handleClearHistory}>
                        Clear history
                      </button>
                    </div>
                    
                    <div className='debt-section'>
                      {ledger.length === 0 ? (
                        <p>No debt records yet. Balance is clear!</p>
                      ) : (
                        ledger.map((item) => {
                          const isUnpaid = item.payment_status === 'unpaid';
                          return (
                            <div key={item.share_id} className="ledger-item-row">
                              {/* <hr/> */}
                              <div>
                                <h4>{item.description}</h4>
                                <p>
                                  <strong>{item.debtor_name === currentUser.username ? 'You' : item.debtor_name}</strong> {item.debtor_name === currentUser.username ? 'owe' : 'owes'} <strong>{item.creditor_name === currentUser.username ? 'You' : item.creditor_name}</strong>
                                </p>
                                <span>
                                  {item.currency} {parseFloat(item.amount_owed).toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span>
                                  {isUnpaid ? 'Unpaid: ' : 'Paid: '}
                                </span>
                                {isUnpaid && (
                                  <button className= "settleButton" onClick={() => handleSettleShare(item.share_id)}>
                                    Settle
                                  </button>
                                )}
                              </div>
                              <hr/>
                              
                            </div>
                          );
                        })
                      
                      )}
                      
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