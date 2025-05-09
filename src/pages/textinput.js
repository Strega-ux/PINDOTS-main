import React from "react";
import { FormattedMessage } from "react-intl";
import { injectIntl } from "react-intl";
import { IntlContext } from "../components/intlwrapper.js";
import { Link } from "react-router-dom";

class TextInput extends React.Component {
  static contextType = IntlContext;

  constructor(props) {
  super(props);

  this.state = {
    txt: this.props.src,
    isListening: false,
    loading: false,
    language: "en-US",
    showDeleteModal: false,
    isReading: false,
  };

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleimport = this.handleimport.bind(this);
    this.handleload = this.handleload.bind(this);
    this.handlesave = this.handlesave.bind(this);
    this.handlesaveas = this.handlesaveas.bind(this);
    this.handleSpeechToText = this.handleSpeechToText.bind(this);
    this.handleReadAloud = this.handleReadAloud.bind(this); // Bind the new method
    this.toggleLanguage = this.toggleLanguage.bind(this); // Added for language toggle
  }

  showDeleteModal = () => {
    this.setState({ showDeleteModal: true });
  };

  hideDeleteModal = () => {
    this.setState({ showDeleteModal: false });
  };

  confirmDelete = () => {
    this.setState({ txt: "", showDeleteModal: false });
    this.props.textcb("");
  };

handleReadAloud = () => {
  if (!("speechSynthesis" in window)) {
    alert("Speech synthesis is not supported in this browser.");
    return;
  }
  if (this.state.isReading) {
    window.speechSynthesis.cancel();
    this.setState({ isReading: false });
    return;
  }
  const utterance = new SpeechSynthesisUtterance(this.state.txt);
  utterance.lang = this.state.language;
  utterance.onend = () => this.setState({ isReading: false });
  utterance.onerror = () => this.setState({ isReading: false });
  this.setState({ isReading: true }, () => {
    window.speechSynthesis.speak(utterance);
  });
};

  async handlesave(event) {
    event.preventDefault();

    console.log(window.pywebview);

    let dialogtitle = this.props.intl.formatMessage({
      id: "input.dialog_saveas_file",
    });
    let filter = [
      this.props.intl.formatMessage({ id: "input.dialog_file_filter_text" }),
      this.props.intl.formatMessage({ id: "input.dialog_file_filter_generic" }),
    ];

    let ret = await window.pywebview.api.save_file(
      this.state.txt,
      dialogtitle,
      filter
    );
  }

  async handlesaveas(event) {
    event.preventDefault();
    let dialogtitle = this.props.intl.formatMessage({
      id: "input.dialog_saveas_file",
    });
    let filter = [
      this.props.intl.formatMessage({ id: "input.dialog_file_filter_text" }),
      this.props.intl.formatMessage({ id: "input.dialog_file_filter_generic" }),
    ];

    let ret = await window.pywebview.api.saveas_file(
      this.state.txt,
      dialogtitle,
      filter
    );
  }

  async handleload(event) {
    event.preventDefault();

    let dialogtitle = this.props.intl.formatMessage({
      id: "input.dialog_open_file",
    });
    let filter = [
      this.props.intl.formatMessage({ id: "input.dialog_file_filter_text" }),
      this.props.intl.formatMessage({ id: "input.dialog_file_filter_generic" }),
    ];
    let ret = await window.pywebview.api.load_file(dialogtitle, filter);
    console.log(ret);
    if (ret.length > 0) {
      let data = JSON.parse(ret);
      this.props.textcb(data.data);
      this.setState({ txt: data.data });
    }
  }

  async handleimport(event) {
    event.preventDefault();
    let dialogtitle = this.props.intl.formatMessage({
      id: "input.dialog_import_file",
    });
    let filter = [
      this.props.intl.formatMessage({ id: "input.dialog_file_filter_generic" }),
    ];

    let ret = await window.pywebview.api.import_pandoc(dialogtitle, filter);
    console.log(ret);
    if (ret.length > 0) {
      let data = JSON.parse(ret);
      if (data.data.length > 0) {
        this.props.textcb(data.data);
        this.setState({ txt: data.data });
      } else if (data.error.length > 0) alert(data.error);
    }
  }

  handleSubmit(event) {
    event.preventDefault();
  }

  handleChange(event) {
    this.setState({ txt: event.target.value });
    this.props.textcb(event.target.value);
  }

// Update handleSpeechToText:
async handleSpeechToText() {
  this.setState({ loading: true, isListening: false });
  // Step 1: Prepare
  const prep = await window.pywebview.api.stt_prepare();
  if (prep.status === "listening") {
    this.setState({ loading: false, isListening: true });
    // Step 2: Listen
    const result = await window.pywebview.api.stt_listen();
    if (result.success) {
      const updatedText =
        this.state.txt + (this.state.txt ? " " : "") + result.text;
      this.setState({ txt: updatedText });
      this.props.textcb(updatedText);
    } else if (result.error) {
      alert("Error: " + result.error);
    }
    this.setState({ isListening: false });
  } else {
    this.setState({ loading: false, isListening: false });
    alert("Could not start listening.");
  }
}

  toggleLanguage() {
    this.setState((prevState) => ({
      language: prevState.language === "en-US" ? "fil-PH" : "en-US",
    }));
  }

  componentDidMount() {
    if (this.props.focusref) this.props.focusref.current.focus();
  }

  render() {
    if (!this.props.options) {
      return (
        <div aria-label="Formulaire de saisie du texte">
          <h1 aria-label="Formulaire de saisie du texte">
            <FormattedMessage
              id="input.title"
              defaultMessage="Saisie du texte"
            />
          </h1>

          <form onSubmit={this.handleSubmit}>
            <textarea
              aria-label={this.props.intl.formatMessage({
                id: "input.text_aria",
              })}
              value={this.state.txt}
              onChange={this.handleChange}
              rows={10}
              cols={10}
              className={this.context.getStyleClass("BrailleInput")}
            >
              {this.state.txt}
            </textarea>
          </form>
        </div>
      );
    } else {
      const ncols = Number(this.props.options.nbcol);
      const nlines = Number(this.props.options.nbline);
      return (
        <div className={this.context.getStyleClass("general")}>
          <h1 aria-hidden={true}></h1>
          {this.state.showDeleteModal && (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-modal-title"
    tabIndex={-1}
    style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}
    onClick={this.hideDeleteModal} // <-- Add this here
  >
    <div
      style={{
        background: "#fff",
        padding: "1em",
        borderRadius: "8px",
        maxWidth: "70vw",
        maxHeight: "70vh",
        outline: "none"
      }}
      onClick={e => e.stopPropagation()}
    >
      <h2 id="delete-modal-title">DeleteText</h2>
      <p>Are you sure you want to delete the text?</p>
      <button
        onClick={this.confirmDelete}
        style={{
    marginRight: "2em",
    padding: "0.5em 0.5em",
    fontSize: "1.25em",
    background: "#d32f2f",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        autoFocus
      >
        Delete All
      </button>
      <button
  onClick={this.hideDeleteModal}
  style={{
    padding: "0.5em 1em",
    fontSize: "1.25em",
    background: "#eee",
    color: "#333",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 2px 8px rgba(0,0,0,0.10)"
  }}>
        Cancel
      </button>
    </div>
  </div>
)}
          <div class="textInputButtons">
            <button
  onClick={this.handleSpeechToText}
  className={
    this.context.getStyleClass("pad-button") + " pure-button "
  }
>
  {this.state.loading
    ? "Loading..."
    : this.state.isListening
    ? "Listening..."
    : "Start Speech-to-Text"}
</button>
            <button
  onClick={this.showDeleteModal}
  className={
    this.context.getStyleClass("pad-button") + " pure-button "
  }
>
  Delete Text
</button>
            <button
  onClick={this.handleReadAloud}
  className={
    this.context.getStyleClass("pad-button") + " pure-button "
  }
>
  {this.state.isReading
    ? this.props.intl.formatMessage({
        id: "input.cancel_read",
        defaultMessage: "Cancel Read",
      })
    : this.props.intl.formatMessage({
        id: "input.read_aloud",
        defaultMessage: "Read Aloud",
      })}
</button>
            <br></br>
            <button
              onClick={this.handleload}
              className={
                this.context.getStyleClass("pad-button") + " pure-button "
              }
            >
              {this.props.intl.formatMessage({ id: "input.loadfile" })}
            </button>
            <button
              onClick={this.handlesave}
              className={
                this.context.getStyleClass("pad-button") + " pure-button "
              }
            >
              {this.props.intl.formatMessage({ id: "input.savefile" })}
            </button>
            <button
              onClick={this.handlesaveas}
              className={
                this.context.getStyleClass("pad-button") + " pure-button "
              }
            >
              {this.props.intl.formatMessage({ id: "input.saveasfile" })}
            </button>
            <button
              onClick={this.handleimport}
              className={
                this.context.getStyleClass("pad-button") + " pure-button "
              }
            >
              {this.props.intl.formatMessage({ id: "input.importfile" })}
            </button>
          </div>

          <form onSubmit={this.handleSubmit}>
            <textarea
              placeholder="Enter text here..."
              aria-label={this.props.intl.formatMessage({
                id: "input.text_aria",
              })}
              value={this.state.txt}
              onChange={this.handleChange}
              rows={nlines}
              cols={ncols}
              ref={this.props.focusref}
              className={this.context.getStyleClass("BrailleInput")}
            >
              {this.state.txt}
            </textarea>
          </form>
        </div>
      );
    }
  }
}

export default injectIntl(TextInput);