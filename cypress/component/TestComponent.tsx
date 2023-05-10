import React, {useState} from 'react';

export const TestComponent = ({title, text}) => {
    console.log('</script>')
    return <div>
        <h1>{title}</h1>
        <p>{text}</p>
    </div>
}

export const ImageTestComponent = ({src}) => {
    const [state, setState] = useState('loading')

    return <div>
        <p><span>State:</span><span data-cy="state">{state}</span></p>
        <img src={src} onLoad={() => setState('success')} onError={() => setState('error')} />
    </div>
}