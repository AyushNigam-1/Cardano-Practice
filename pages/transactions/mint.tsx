import {
  BlockfrostProvider,
  BrowserWallet,
  MeshTxBuilder,
  NativeScript,
  resolveNativeScriptHash,
  resolveNativeScriptHex,
  resolvePaymentKeyHash,
} from "@meshsdk/core";

export const mintExample = async (wallet: BrowserWallet | null) => {
  if (!wallet) {
    alert("Please connect your wallet");
    return;
  }
  if (!process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY) {
    alert("Please set up environment variables");
    return;
  }

  // Set up tx builder with blockfrost support
  const blockfrost: BlockfrostProvider = new BlockfrostProvider(
    process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY,
    0
  );
  const txBuilder: MeshTxBuilder = new MeshTxBuilder({
    fetcher: blockfrost,
    submitter: blockfrost,
  });

  // Get utxos from wallet, with selection
  const inputUtxos = await wallet?.getUtxos([
    {
      unit: "lovelace",
      quantity: "5000000",
    },
  ]);

  if (!inputUtxos) {
    alert(
      "Utxo selection failed, either wallet has insufficient funds, or something went wrong"
    );
    return;
  }

  // Add all selected inputs into the tx builder
  for (let i = 0; i < inputUtxos.length; i++) {
    const utxo = inputUtxos[i];
    txBuilder.txIn(utxo.input.txHash, utxo.input.outputIndex);
  }

  // Get change address from wallet
  const changeAddress = await wallet.getChangeAddress();

  // This is a very simple native script that defines the
  // minting conditions of our token
  const nativeScript: NativeScript = {
    type: "sig",
    keyHash: resolvePaymentKeyHash(changeAddress),
  };

  // Send the minted token with 2 ADA back to our change address
  await txBuilder
    .txOut(changeAddress, [
      {
        unit: "lovelace",
        quantity: "2000000",
      },
    ])
    .mint(
      "1",
      resolveNativeScriptHash(nativeScript),
      Buffer.from("TEST", "utf-8").toString("hex") // Note that asset names are base16 encoded, so we cannot just input "TEST", this results in "54455354"
    )
    .mintingScript(resolveNativeScriptHex(nativeScript))
    .changeAddress(changeAddress)
    .complete();

  // Complete the signing process in the browser wallet
  try {
    const signedTx = await wallet.signTx(txBuilder.txHex);
    console.log(signedTx);
  } catch (err) {
    console.log(err);
  }
};

// Exercise 2: Try to decode this cbor and find the following information:
// Inputs
// Outputs
// Mint
// transaction_witness_set.vkeywitness
// transaction_witness_set.native_script

// While this seems like a very simple transaction, there is actually a lot going on.
// In particular, an asset's identity is separated into two parts, something called a policy id, and the asset's name.
// Exercise 2a: Could you try and find information on what a policy id is?
// After which, try to explain concisely what the above nativeScript is doing.


// [{ 0: [[h'E1F11D7E9D34E0264C022EBEF0E23147F51CB9614C7C6299BF1DEDDE84C405B9', 0]], 1: [[h'00547A1A9F72988C93AD6F6DD6208061BA88BDD4B771ED9F0484EE1229BFD1261C8932B1BDA5BF4BC76C0C5CBE0C83EDB28BE352C6CC24C4C3', 2000000], [h'00547A1A9F72988C93AD6F6DD6208061BA88BDD4B771ED9F0484EE1229BFD1261C8932B1BDA5BF4BC76C0C5CBE0C83EDB28BE352C6CC24C4C3', [9997826931, { h'BDF3A14517E60AC6BD8942F69117D9550EEA65D7C5C655175EB84910': { h'54455354': 1 } }]]], 2: 173069, 4: [], 9: { h'BDF3A14517E60AC6BD8942F69117D9550EEA65D7C5C655175EB84910': { h'54455354': 1 } } }, { 0: [[h'673CC15C2FFCE52AA8B83DC1559AB3B01C66DE706C52CB5F7C579EA5DE74C04C', h'35B44DB7FC9E66569B1CD1A29B0B1560B0A6C8CC9D58D9B018754DF84F8127AB33AF6AD99E5003F49B058FABFC21C5417F7D3830631DFA14C1127176D3BC7607']], 1: [[0, h'547A1A9F72988C93AD6F6DD6208061BA88BDD4B771ED9F0484EE1229']] }, true, null]

//   in this decoded cbor

// inputs = { 0: [[h'E1F11D7E9D34E0264C022EBEF0E23147F51CB9614C7C6299BF1DEDDE84C405B9', 0]] }

// output = {
//   1: [[h'00547A1A9F72988C93AD6F6DD6208061BA88BDD4B771ED9F0484EE1229BFD1261C8932B1BDA5BF4BC76C0C5CBE0C83EDB28BE352C6CC24C4C3', 2000000],
//   [h'00547A1A9F72988C93AD6F6DD6208061BA88BDD4B771ED9F0484EE1229BFD1261C8932B1BDA5BF4BC76C0C5CBE0C83EDB28BE352C6CC24C4C3', [9997826931,
//     { h'BDF3A14517E60AC6BD8942F69117D9550EEA65D7C5C655175EB84910': { h'54455354': 1 } }]]]
// }

// mint = { 9: { h'BDF3A14517E60AC6BD8942F69117D9550EEA65D7C5C655175EB84910': { h'54455354': 1 } } }

// transaction_witness_set.vkeywitness = 673CC15C2FFCE52AA8B83DC1559AB3B01C66DE706C52CB5F7C579EA5DE74C04C

// transaction_witness_set.native_script = 547A1A9F72988C93AD6F6DD6208061BA88BDD4B771ED9F0484EE1229


// policy_id = policy id is basically the unique indentity assigned to the asset for its identification and management

// native_script = native script is a set of conditions that should be met while minting and exhanging tokens, it ensures security, flexiblity, control and authorization

// const nativeScript: NativeScript = {
//   type: "sig",
//   keyHash: resolvePaymentKeyHash(changeAddress),
// };

// in this code we set type to sig to ensure that certain type of actions like minting and exhanging token will require a signature of the owner and in this way it prevent unauthorized actions and ensures authencity

// key_hash is the payment key hash of the change address.This means the token can only be minted if signed by the owner of the corresponding private key

// here change_address is the address where the leftover funds will be delivered back(e.g sender address), left over funds are basically the difference b / w the total funds in the wallet and the funds we want to send to the other account 