import '../FooterSection.css'
import { useNavigate } from 'react-router-dom';

export function FooterSection() {
    const navigate = useNavigate();
    return (
        <div className='footer'>
        <button className='btn-logout' onClick={() => navigate('/')}>
          Log Out
        </button>
      </div>
    )
}

