export const errorReload = (_error: string, retries = 1) => {

    let errRetries: string | null = sessionStorage.getItem("errRetries");
    if (typeof errRetries === 'string') {
      if (parseInt(errRetries) >= retries) {
        return;
      }

      sessionStorage.setItem("errRetries", String(parseInt(errRetries) + 1));
    } else {
      sessionStorage.setItem("errRetries", "1");
    }

    window.location.reload();
  }