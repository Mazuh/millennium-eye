import { useState } from 'react';
import get from 'lodash.get';

export default function CardDetails() {
  const [cardData, setCardData] = useState({});

  const retrieveCardDetails = (event) => {
    event.preventDefault();

    const name = event.target.cardName.value || '';
    fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${name}`)
      .then((response) => response.json())
      .then((data) => setCardData(get(data, 'data.0', {})))
      .catch((error) => console.warn(error));
  };

  return (
    <>
      <form onSubmit={retrieveCardDetails}>
        <input name="cardName" />
        <button type="submit">Pesquisar</button>
      </form>
      {cardData.name && (
        <img src={get(cardData, 'card_images.0.image_url', '')} alt={cardData.name} />
      )}
    </>
  );
}
