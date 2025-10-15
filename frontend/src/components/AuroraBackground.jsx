import React from "react";
import "./AuroraTitle.css"; 

const AuroraBackground = ({ children }) => {
  return (
    <div className="aurora-container" style={{ padding: "2rem", borderRadius: "2rem" }}>
      <div className="aurora" style={{ zIndex: 0 }}>
        <div className="aurora__item"></div>
        <div className="aurora__item"></div>
        <div className="aurora__item"></div>
        <div className="aurora__item"></div>
      </div>
      <div style={{ position: "relative", zIndex: 5 }}>
        {children}
      </div>
    </div>
  );
};

export default AuroraBackground;
