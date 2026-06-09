
import { useState } from 'react'; 
import axios from 'axios'; 
import { useNavigate, Link} from 'react-router-dom'; 
import '../App.css'; 
import JBSolverLogo from '../assets/JBSolverLogo.png';

function LoginPage() {
    const navigate = useNavigate(); 
    const [ username, setUsername ] = useState(''); 
    const [ password, setPassword ] = useState(''); 
    const [ errorMessage, setErrorMessage ] = useState(''); 

    const API_URL = 'http://localhost:5001/api/accounts'; 
    const handlelogin = (e) => {
        e.preventDefault(); 
        setErrorMessage(''); 
        axios.post(`${API_URL}/login`, { username, password })
             .then((res) => {
                localStorage.setItem('token', res.data.token); 
                localStorage.setItem('userId', res.data.user.user_id);
                navigate('/home'); 
             })
             .catch((err) => {
                setErrorMessage(err.response?.data?.error || 'Login failed'); 
             });           
    };

    return (
        <div className='entirePage'>
            <div className="auth-container">
                <div className="auth-header">
                    <img src={JBSolverLogo} className="logo-img"/>
                </div>
                {errorMessage && (
                    <div className="error-message">⚠️ {errorMessage}</div>
                )}
                <form className="auth-form" onSubmit={handlelogin}>
                    <p style={{ fontSize: '18px' }}> Welcome to JBSolver</p>
                    <h2 style={{ fontSize: '28px'}}>Sign In</h2>
                    <input 
                        placeholder="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}/>
                    <input 
                        type='password'
                        placeholder='password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}/>
                    <button className='btn-login'>Login</button>

                    <p className='switch-view-text'>
                        Don't have an account?{" "}
                        <Link className='link-text'to='/register'>Register Here</Link>
                    </p>
                </form>
            </div>
            
        </div>
    )

}
export default LoginPage; 












