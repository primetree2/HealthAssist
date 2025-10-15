import React from "react";
import "./AuroraTitle.css";

const AuroraTitle = ({ text }) => {
  return (
    <div className="aurora-container">
      <h1 className="title">{text}</h1>
      <div className="aurora">
        <div className="aurora__item"></div>
        <div className="aurora__item"></div>
        <div className="aurora__item"></div>
        <div className="aurora__item"></div>
      </div>
    </div>
  );
};

export default AuroraTitle;
