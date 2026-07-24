import { useState } from 'react';
import axios from 'axios'; 
import { useNavigate, Link } from 'react-router-dom'; 
import '../App.css';
import JBSolverLogo from '../assets/JBSolverLogo.png'; 

function RegisterPage() {
    const navigate = useNavigate();
    const [ username, setUsername ] = useState(''); 
    const [ password, setPassword ] = useState(''); 
    const [ email, setEmail ] = useState(''); 
    const API_URL = 'http://localhost:5001/api/accounts'; 

    // const API_URL = 'https://jb-solver-orbital.onrender.com/api/accounts'; 

    const handleRegister = (e) => {
        e.preventDefault(); 
        axios.post(`${API_URL}/register`, { username, password, email})
             .then(() => {
                alert('Registered!');
                navigate('/');
             });
    };

    return (
        <div className='entirePage'>
            <div className='auth-container'>
                <div className='auth-header'>
                    <img src={JBSolverLogo} className='logo-img'/>
                </div>

                <form className='auth-form' onSubmit={handleRegister}>
                    <h2 style={{ fontSize: '24px' }}>Create Account</h2>

                    <input placeholder='Username'
                           value={username}
                           onChange={(e) => setUsername(e.target.value)}/>
                    
                    <input placeholder='Email'
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}/>
                    <input type='password'
                           placeholder='Password'
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}/>
                    <button className='btn-register'>Register</button>
                    <p className='switch-view-text'>
                        Already registered? {" "}
                        <Link className='link-text' to='/'>Sign In</Link>
                    </p>

                </form>
            </div>
        </div>
    );
}
export default RegisterPage; 