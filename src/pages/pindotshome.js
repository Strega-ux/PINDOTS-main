import React from "react";
import { useNavigate } from "react-router-dom";
import logo2 from "./images/pindotsLogo2.png";
import bg from "./images/homepage.png";
import about from "./images/aboutUs.png";
import "../App.css";

const PindotsHome = () => {
  const navigate = useNavigate();

  return (
    <div>
      <img class="homebg" src={bg} alt="Background" />
      <a
        href="https://github.com/braillerap/AccessBrailleRAP/releases"
        target="_blank"
        rel="noopener noreferrer"
        tabIndex="0"
      >
        <img class="aboutUs" src={about} alt="About Us" />
      </a>

      <div class="homeContainer">
        <img class="homeLogo" src={logo2} alt="Pindots Secondary Logo" />
        <text class="homeCTA">Print your words into braille.</text>
        <nav>
          <button class="homeButton" onClick={() => navigate("/textinput")}>
            Start now
          </button>
        </nav>
      </div>
    </div>
  );
};

export default PindotsHome;
