import { useState } from 'react';
import get from 'lodash.get';
import { Tabs, Tab } from 'react-bootstrap';

export default function CardDetails() {
  const [cardData, setCardData] = useState({});
  const [selectedTab, setSelectedTab] = useState('image');

  const retrieveCardDetails = (event) => {
    event.preventDefault();

    const name = event.target.cardName.value || '';
    fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${name}&language=pt`)
      .then((response) => response.json())
      .then((data) => setCardData(get(data, 'data.0', {})))
      .catch((error) => console.warn(error));
  };

  return (
    <>
      <form className="d-flex" onSubmit={retrieveCardDetails}>
        <input name="cardName" />
        <button type="submit">Pesquisar</button>
      </form>
      {cardData.name && (
        <Tabs
          className="m-1"
          id="card-details"
          activeKey={selectedTab}
          onSelect={(k) => setSelectedTab(k)}
          unmountOnExit
        >
          <Tab eventKey="image" title="Imagem">
            <img src={get(cardData, 'card_images.0.image_url', '')} alt={cardData.name} />
          </Tab>
          <Tab className="d-flex flex-column" eventKey="details" title="Detalhes">
            <span>
              <strong>{cardData.name}</strong>
            </span>
            <span>
              <strong>Ataque: </strong>
              {cardData.atk}
            </span>
            <span>
              <strong>Defesa: </strong>
              {cardData.def}
            </span>
            <span>
              <strong>Atributo: </strong>
              {cardData.attribute}
            </span>
            <span>
              <strong>Descrição: </strong>
              {cardData.desc}
            </span>
          </Tab>
        </Tabs>
      )}
    </>
  );
}
