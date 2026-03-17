import { Link } from "react-router-dom"

export const Navbar = () => {
  return (
    <nav>
      <section>
        <h1>Redux Essentials Example</h1>

        <div className="navContent">
          <div className="navLinks">
            <Link to="/">Send Email</Link>
            <br/>
            <Link to="/admin">Admin</Link>
            <br/>
            <Link to="/posts">Posts Dummy App</Link>
          </div>
        </div>
      </section>
    </nav>
  )
}
