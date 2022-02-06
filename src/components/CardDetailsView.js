import { useState } from 'react';
import get from 'lodash.get';
import { Tabs, Tab, Spinner } from 'react-bootstrap';

export default function CardDetailsView() {
  const [cardData, setCardData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const retrieveCardDetails = (event) => {
    event.preventDefault();

    const name = event.target.cardName.value || '';
    setIsLoading(true);
    fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${name}&language=pt`)
      .then((response) => response.json())
      .then((data) => {
        setIsError(false);
        setCardData(get(data, 'data.0', {}));
      })
      .catch((error) => {
        setIsError(true);
        console.warn(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <>
      <form className="d-flex" onSubmit={retrieveCardDetails}>
        <input name="cardName" />
        <button type="submit">Pesquisar</button>
      </form>
      {cardData.name && <CardDetails cardData={cardData} isError={isError} isLoading={isLoading} />}
    </>
  );
}

function CardDetails({ cardData, isError, isLoading }) {
  const [selectedTab, setSelectedTab] = useState('image');

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center w-100 m-2">
        <Spinner animation="border" variant="dark" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="d-flex justify-content-center w-100 m-2">
        <span>Erro ao carregar os dados.</span>
      </div>
    );
  }

  return (
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
  );
}
