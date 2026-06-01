import { useState } from 'react';
import axios from 'axios';
import './App.css'; // Importing your separate stylesheet!
import JBSolverLogo from './JBSolverLogo.png'; 
import communityGroup from './communityGroup.png';
import expenseTracker from './expenditureTracker96.png'; 
import userProfile from './user96.png'; 
import picture from './picture.png';
import {BarChart3, Users, UserCircle} from 'lucide-react';

function App() {
  const [view, setView] = useState('login'); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const API_URL = 'http://localhost:5001/api/accounts';

  const handleRegister = (e) => {
    e.preventDefault();
    setErrorMessage('');

    axios.post(`${API_URL}/register`, { username, password, email })
      .then((res) => {
        alert(res.data.message);
        setView('login');
        setPassword('');
      })
      .catch((err) => {
        setErrorMessage(err.response?.data?.error || 'Registration failed');
      });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMessage('');

    axios.post(`${API_URL}/login`, { username, password })
      .then((res) => {
        setLoggedInUser(res.data.user);
        setView('homepage');
        localStorage.setItem('token', res.data.token);
      })
      .catch((err) => {
        setErrorMessage(err.response?.data?.error || 'Login failed');
      });
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('token');
    setUsername('');
    setPassword('');
    setEmail('');
    setView('login');
  };

  if (view === 'homepage') {
    return (
      <div className="homepage-container">
        <div className= "topSectionBar"> 
          <img src={JBSolverLogo} alt="JB-Solver Logo" className="logo-img" />
          <div className="right-buttons-3"> 
            <div className="button-wrapper">
              <button className="expenditureTracker"> 
                <img src={expenseTracker} alt="JB-Solver Logo" className= "expense-img"/>
              </button>
              <span className="hover-tooltip">Expenditure Tracker</span>
            </div>
            <div className="button-wrapper">
              <button className= "communityGroupButton"> 
                <img src={communityGroup} alt="JB-Solver Logo" className= "group-img"/>
              </button>
              <span className="hover-tooltip">Community Groups</span>
            </div>
            <div className="button-wrapper">
              <button className= "userProfileButton"> 
                <img src={userProfile} alt="JB-Solver Logo" className= "userProfile-img"/>
              </button>
              <span className="hover-tooltip">User Profile</span>
            </div>
          </div>
        </div>

        {/* <h1>🏠 Welcome to the Protected Homepage!</h1> */}
        <br></br>
        
        <div className="profile-card">
          <div className="profile-header">
            <img src={picture} alt='Profile' className='profilePicture-img'/>
            <div className='profile-main-info'>
              <h2>{loggedInUser.username}</h2>
              <p className='profile-role'>Community Member</p>
            </div>
          </div>
          <div className='profile-details'>
            <p>
              <strong>ID:</strong> {loggedInUser?.id}
            </p>
            <p>
              <strong>Email:</strong> {loggedInUser?.email}
            </p>
          </div>
          <button className="edit-profile-btn">
            Edit Profile
          </button>
        </div>

        
        

        <button onClick={handleLogout} className="btn-logout">
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className= "entirePage"> 
    <div className="auth-container">
      
      <div className="auth-header">
        {/* <h2>🚀 JB-Solver-Orbital Secure Access</h2>
        <p>Please enter your database registration keys.</p> */}
        <img src={JBSolverLogo} alt="JB-Solver Logo" className="logo-img" />
        
      </div>

      {errorMessage && (
        <div className="error-message">
          ⚠️ {errorMessage}
        </div>
      )}

      {view === 'login' ? (
        <form onSubmit={handleLogin} className="auth-form">
          
          <p style={{fontSize: '18px'}}>Welcome to JBSolver</p>
          <h2> <strong style={{fontSize: '28px'}}> Sign In</strong> </h2>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="btn-login">Login</button>
          <p className="switch-view-text" style={{fontSize: '16px'}}>
            Don't have an account? <span onClick={() => { setView('register'); setErrorMessage(''); }} className="link-text">Register Here</span>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="auth-form">
          <h3><strong style={{fontSize:'24px'}}>Create Account</strong></h3>
          <input type="text" placeholder="Choose Username" value={username} onChange={e => setUsername(e.target.value)} required />
          <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Create Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="btn-register">Register</button>
          <p className="switch-view-text" style={{fontSize: '16px'}}>
            Already registered? <span onClick={() => { setView('login'); setErrorMessage(''); }} className="link-text">Sign In Here</span>
          </p>
        </form>
      )}
    </div>
    </div>
    
  );
}

export default App;







//_____________First Practice______________
// function App() {
//   const [accounts, setAccounts] = useState([]);
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [email, setEmail] = useState('');
//   const [editEmail, setEditEmail] = useState('');
//   const [editingId, setEditingId] = useState(null);

//   const API_URL = 'http://localhost:5432/api/accounts';

//   // 1. READ: Fetch records automatically on load
//   const fetchAccounts = () => {
//     axios.get(API_URL)
//       .then(res => setAccounts(res.data))
//       .catch(err => console.error("Error fetching data:", err));
//   };

//   useEffect(() => {
//     fetchAccounts();
//   }, []);

//   // 2. CREATE: Submit new user form
//   const handleCreate = (e) => {
//     e.preventDefault();
//     if (!username || !password || !email) return alert("Fill in all fields!");

//     axios.post(API_URL, { username, password, email })
//       .then(() => {
//         fetchAccounts(); // Refresh the list
//         setUsername(''); setPassword(''); setEmail(''); // Clear form inputs
//       })
//       .catch(err => console.error("Error creating account:", err));
//   };

//   // 3. UPDATE: Submit edited email change
//   const handleUpdate = (id) => {
//     axios.put(`${API_URL}/${id}`, { email: editEmail })
//       .then(() => {
//         setEditingId(null); // Close editing mode input
//         setEditEmail('');
//         fetchAccounts(); // Refresh the list
//       })
//       .catch(err => console.error("Error updating account:", err));
//   };

//   // 4. DELETE: Trigger account removal
//   const handleDelete = (id) => {
//     if (window.confirm("Are you sure you want to delete this account?")) {
//       axios.delete(`${API_URL}/${id}`)
//         .then(() => fetchAccounts())
//         .catch(err => console.error("Error deleting account:", err));
//     }
//   };

//   return (
//     <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
//       <h1>🚀 JB-Solver-Orbital Full-Stack CRUD Dashboard</h1>
//       <hr />

//       {/* CREATE FORM */}
//       <div style={{ backgroundColor: '#f4f4f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
//         <h3>Add New Account (CREATE)</h3>
//         <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
//           <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
//           <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
//           <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
//           <button type="submit" style={{ cursor: 'pointer', background: '#22c55e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>Add User</button>
//         </form>
//       </div>

//       {/* READ & DISPLAY TABLE WITH UPDATE/DELETE ACTIONS */}
//       <h3>Current Database Records (READ)</h3>
//       <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
//         <thead>
//           <tr style={{ backgroundColor: '#e4e4e7' }}>
//             <th>ID</th>
//             <th>Username</th>
//             <th>Email</th>
//             <th>Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {accounts.map((user) => (
//             <tr key={user.user_id}>
//               <td>{user.user_id}</td>
//               <td>{user.username}</td>
//               <td>
//                 {editingId === user.user_id ? (
//                   <input 
//                     type="email" 
//                     value={editEmail} 
//                     placeholder="New Email"
//                     onChange={e => setEditEmail(e.target.value)} 
//                   />
//                 ) : (
//                   user.email
//                 )}
//               </td>
//               <td>
//                 {editingId === user.user_id ? (
//                   <>
//                     <button onClick={() => handleUpdate(user.user_id)} style={{ marginRight: '5px', background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
//                     <button onClick={() => setEditingId(null)} style={{ background: '#71717a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
//                   </>
//                 ) : (
//                   <>
//                     <button onClick={() => { setEditingId(user.user_id); setEditEmail(user.email); }} style={{ marginRight: '5px', background: '#f59e0b', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Edit (UPDATE)</button>
//                     <button onClick={() => handleDelete(user.user_id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Delete (DELETE)</button>
//                   </>
//                 )}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }
//export default App;

//_____________original________________
// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>

//       <div className="ticks"></div>

//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>

//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }


