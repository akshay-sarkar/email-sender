import "./App.css"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { PostsList } from "./features/posts/PostsList"
import { SinglePostPage } from "./features/posts/SinglePostPage"
import { Navbar } from "./app/Navbar"
import { EditPostForm } from "./features/posts/EditPostForm"
import { EmailSender } from "./features/email/EmailSender"
import { AdminPage } from "./features/admin/AdminPage"

export const App = () => (
  <Router>
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/posts" element={<PostsList />}></Route>
        <Route path="/posts/:postId" element={<SinglePostPage />} />
        <Route path="/editPost/:postId" element={<EditPostForm />} />
        <Route path="/" element={<EmailSender />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<h2>Page Not Found</h2>} />
      </Routes>
    </div>
  </Router>
)

export default App
