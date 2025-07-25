import React, { Component } from "react";
import { Outlet, Link } from "react-router-dom";
import { IntlContext } from "./components/intlwrapper.js";
import { injectIntl } from "react-intl";
import { FormattedMessage } from "react-intl";

import "./App.css";
import logo from "./pages/images/pindotsLogo.png";
import homeIcon from "./pages/images/homeIcon.png";
import about from "./pages/images/aboutUs.png";

class Layout extends Component {
  static contextType = IntlContext;
  constructor(props) {
    super(props);

    this.onClickMenu = this.onClickMenu.bind(this);
  }

  onClickMenu() {
    if (this.props.focuscb) this.props.focuscb();
  }
  fstatus() {
    if (this.props.status === 0)
      return (
        <p>
          <FormattedMessage
            id="layout.print_not_progress"
            defaultMessage="Aucune impression en cours"
          />
        </p>
      );
    else
      return (
        <h2>
          <FormattedMessage
            id="layout.print_in_progress"
            defaultMessage="Impression en cours"
          />
        </h2>
      );
  }
  render() {
    let direction = "ltr"; // defaut to left-to-right reading
    if (this.context.localeinfo.dir) direction = this.context.localeinfo.dir;

    return (
      <div className={this.context.getStyleClass("main-div")} dir={direction}>
        <header>
          <div className="pure-g">
            <div
              className={
                "pure-u-1-5 " + this.context.getStyleClass("headerside")
              }
            ></div>
            <div
              className={
                "pure-u-3-5 " + this.context.getStyleClass("headermain")
              }
            >
              <div className="menu_font" role={"presentation"}>
                <Link to="pindots">
                  <img class="homeIcon" src={homeIcon} alt="Home Icon" />
                </Link>
                <img class="pindotsLogo" src={logo} alt="Pindots Logo" />
                <a
                  href="https://github.com/braillerap/AccessBrailleRAP/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex="0"
                >
                  <img class="aboutUsLayout" src={about} alt="About Us" />
                </a>

                <nav>
                  <ul className={this.context.getStyleClass("menu")}>
                    <li>
                      <Link to="/" onClick={this.onClickMenu}>
                        <FormattedMessage
                          id="layout.param_input"
                          defaultMessage="Saisie"
                        />
                      </Link>
                    </li>

                    <li>
                      <Link to="/impression" onClick={this.onClickMenu}>
                        <FormattedMessage
                          id="layout.param_print"
                          defaultMessage="Impression"
                        />
                      </Link>
                    </li>
                    <li>
                      <Link to="/parametre" onClick={this.onClickMenu}>
                        <FormattedMessage
                          id="layout.param_menu"
                          defaultMessage="Paramètres"
                        />
                      </Link>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
            <div
              className={
                "pure-u-1-5 " + this.context.getStyleClass("headerside")
              }
            ></div>
          </div>
        </header>

        <main>
          <div className="pure-g main_layout">
            <div
              className={"pure-u-1-5 " + this.context.getStyleClass("bodyside")}
            ></div>

            <div
              className={"pure-u-3-5 " + this.context.getStyleClass("bodymain")}
            >
              <div
                aria-live={"polite"}
                aria-atomic={false}
                role={"log"}
                aria-relevant={"all"}
              >
                <Outlet />
              </div>
            </div>
            <div
              className={"pure-u-1-5 " + this.context.getStyleClass("bodyside")}
            ></div>
          </div>
        </main>
      </div>
    );
  }
}

export default injectIntl(Layout);
