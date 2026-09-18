import { Component } from 'react';

export default class RoomBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="three-loading-shell"><div className="empty-state" role="alert"><h2>This room couldn’t open</h2><p>Your goals and awards are still available in the house overview.</p><button type="button" className="house-enter-btn" onClick={this.props.onBack}>Back to my house</button></div></div>;
    return this.props.children;
  }
}
