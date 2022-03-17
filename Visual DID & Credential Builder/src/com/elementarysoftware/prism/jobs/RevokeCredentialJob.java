package com.elementarysoftware.prism.jobs;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Vector;

import org.json.simple.JSONObject;
import com.elementarysoftware.prism.DID;

import io.iohk.atala.prism.api.CredentialClaim;
import io.iohk.atala.prism.api.KeyGenerator;
import io.iohk.atala.prism.api.node.IssueCredentialsInfo;
import io.iohk.atala.prism.api.node.NodePayloadGenerator;
import io.iohk.atala.prism.api.node.RevokeCredentialsInfo;
import io.iohk.atala.prism.credentials.CredentialBatchId;
import io.iohk.atala.prism.crypto.EC;
import io.iohk.atala.prism.crypto.Sha256Digest;
import io.iohk.atala.prism.crypto.derivation.ExtendedKey;
import io.iohk.atala.prism.crypto.derivation.KeyDerivation;
import io.iohk.atala.prism.crypto.keys.ECKeyPair;
import io.iohk.atala.prism.crypto.keys.ECPrivateKey;
import io.iohk.atala.prism.crypto.keys.ECPublicKey;
import io.iohk.atala.prism.identity.Did;
import io.iohk.atala.prism.identity.LongFormPrismDid;
import io.iohk.atala.prism.identity.PrismDid;
import io.iohk.atala.prism.identity.PrismKeyInformation;
import io.iohk.atala.prism.identity.PrismKeyType;
import io.iohk.atala.prism.protos.ECKeyData;
import io.iohk.atala.prism.protos.PublicKey;
import publishDid.PrismCredentialAction;

//import kotlinx.serialization.decodeFromString;
import kotlinx.serialization.StringFormat;
import kotlinx.serialization.json.Json;
import kotlinx.serialization.json.JsonObject;

public class RevokeCredentialJob implements Runnable {

	private DID issuerDID;

	// private DIDKeyInfo[] keysToAdd;
	// private String[] keysToRevoke;

	public RevokeCredentialJob(DID d) {
		issuerDID = d;
	}

	public void run() {
		String operationHash = "";
		try {

			KeyGenerator keygen = KeyGenerator.INSTANCE;
			
			ECKeyPair issuerMasterKeyPair = keygen.deriveKeyFromFullPath(issuerDID.getSeed(), 0,
					PrismKeyType.INSTANCE.getMASTER_KEY(), 0);
			ECKeyPair issuerRevocationKeyPair = keygen.deriveKeyFromFullPath(issuerDID.getSeed(), 0,
					PrismKeyType.INSTANCE.getREVOCATION_KEY(), 1);

			
			LongFormPrismDid issuingDIDLongForm = PrismDid
					.buildLongFormFromMasterPublicKey(issuerMasterKeyPair.getPublicKey());

			Map<String, ECPrivateKey> keys = new HashMap<String, ECPrivateKey>();
			keys.put(PrismDid.getDEFAULT_MASTER_KEY_ID(), issuerMasterKeyPair.getPrivateKey());
			keys.put("revocation1", issuerRevocationKeyPair.getPrivateKey());
			NodePayloadGenerator nodePayloadGenerator = new NodePayloadGenerator(issuingDIDLongForm, keys);
			
			String credBatchId = "8b76daa46fcd1b24273f77fa2a9d584920cb646c88dbe41c299352de076752cd";
			String latestCredBatchOperationHash = "fad70010dab41fbb411e72f0ab9ae49cea8a49cc853438fd6949bded2e8a046f";
			
			Sha256Digest latestCredentialBatchOpHash = Sha256Digest.fromHex(latestCredBatchOperationHash);
			
			List<Sha256Digest> credentialsToRevoke = new Vector<Sha256Digest>();
			CredentialBatchId credentialBatchId = CredentialBatchId.fromString(credBatchId);
			
			RevokeCredentialsInfo revokeInfo = nodePayloadGenerator.revokeCredentials(
					"revocation1", 
					latestCredentialBatchOpHash, 
					credentialBatchId.getId(), 
					credentialsToRevoke.toArray(Sha256Digest[]::new)
			);
			
			// Creating a File object that represents the disk file. 
			PrintStream o = new PrintStream(new FileOutputStream(issuerDID.getLogFilePath(), true), true);
			
			// Store current System.out before assigning a new value 
			PrintStream console = System.out;
			// Assign o to output stream 
			System.setOut(o);
		
			operationHash = PrismCredentialAction.Companion.revokeCredentials(
					issuingDIDLongForm.asCanonical(), 
					revokeInfo, 
					"revocation1",
					latestCredentialBatchOpHash,
					credentialBatchId.getId(),
					credentialsToRevoke.toArray(Sha256Digest[]::new));
			System.out.println("REVOKE CREDENTIAL OPERATION HASH RETURNED = " + operationHash);
			
			System.setOut(console);
			

		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
		if (operationHash != "") {
			//System.out.println("Saving operation hash to xml");
			//issuerDID.setLatestOperationHash(operationHash);
			//System.out.println("Operation hash after xml update " + issuerDID.getLatestOperationHash());
		}
	}

}
