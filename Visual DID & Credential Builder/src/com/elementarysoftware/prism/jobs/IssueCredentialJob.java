package com.elementarysoftware.prism.jobs;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Vector;

import org.json.simple.JSONObject;

import com.elementarysoftware.prism.Batch;
import com.elementarysoftware.prism.Contact;
import com.elementarysoftware.prism.Credential;
import com.elementarysoftware.prism.DID;
import com.elementarysoftware.vdcb.Settings;

import io.iohk.atala.prism.api.CredentialClaim;
import io.iohk.atala.prism.api.KeyGenerator;
import io.iohk.atala.prism.api.node.IssueCredentialsInfo;
import io.iohk.atala.prism.api.node.NodePayloadGenerator;
import io.iohk.atala.prism.crypto.EC;
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

public class IssueCredentialJob implements Runnable {

	private DID issuerDID;
	private Contact holderContact;
	private JSONObject credentialJson;
	private Settings settings;

	public IssueCredentialJob(DID d, Contact holder, JSONObject credential, Settings s) {
		issuerDID = d;
		holderContact = holder;
		credentialJson = credential;
		settings = s;
	}

	public void run() {
		String operationHash = "";
		String batchId = "";
		String signedCredentialHash = "";
		
		try {

			KeyGenerator keygen = KeyGenerator.INSTANCE;
			
			ECKeyPair issuerMasterKeyPair = keygen.deriveKeyFromFullPath(issuerDID.getSeed(), 0,
					PrismKeyType.INSTANCE.getMASTER_KEY(), 0);
			ECKeyPair issuerIssuingKeyPair = keygen.deriveKeyFromFullPath(issuerDID.getSeed(), 0,
					PrismKeyType.INSTANCE.getISSUING_KEY(), 1);

			/*
			 * Er det mulig å hente ut eksisterende Issuing key, eller skal man generere en
			 * ny?
			 */

			LongFormPrismDid issuingDIDLongForm = PrismDid
					.buildLongFormFromMasterPublicKey(issuerMasterKeyPair.getPublicKey());

			Map<String, ECPrivateKey> keys = new HashMap<String, ECPrivateKey>();
			keys.put(PrismDid.getDEFAULT_MASTER_KEY_ID(), issuerMasterKeyPair.getPrivateKey());
			keys.put("issuing1", issuerIssuingKeyPair.getPrivateKey());
			NodePayloadGenerator nodePayloadGenerator = new NodePayloadGenerator(issuingDIDLongForm, keys);
			
			// Creating a File object that represents the disk file. 
			PrintStream o = new PrintStream(new FileOutputStream(issuerDID.getLogFilePath(), true), true);
						
			// Store current System.out before assigning a new value 
			PrintStream console = System.out;
			// Assign o to output stream 
			System.setOut(o);

			System.out.println("Json as JSONString" + credentialJson.toJSONString());

			System.out.println("------- keys --------");
			Iterator i = credentialJson.keySet().iterator();
			while (i.hasNext()) {
				System.out.println("- " + i.next());
			}
			System.out.println("---------------------");
			
			JsonObject kotlin_credentialJsonObject = publishDid.JsonHelper.Companion.getJsonObject(credentialJson.toJSONString());
			
			List<CredentialClaim> claims = new Vector<CredentialClaim>();
			
			String holderDIDString = holderContact.getDIDString();
			
			PrismDid holderDid = PrismDid.fromString(holderDIDString);
			
			CredentialClaim claim = new CredentialClaim(holderDid, kotlin_credentialJsonObject);
			claims.add(claim);
			
			IssueCredentialsInfo credInfo = nodePayloadGenerator.issueCredentials("issuing1", claims.toArray(CredentialClaim[]::new));
			
			batchId = credInfo.getBatchId().getId();
			signedCredentialHash = credInfo.getCredentialsAndProofs()[0].getSignedCredential().hash().getHexValue();
			
			operationHash = PrismCredentialAction.Companion.publishCredential(issuingDIDLongForm.asCanonical(), credInfo, "issuing1");
			System.out.println("ISSUE CREDENTIAL OPERATION HASH RETURNED = " + operationHash);
			
			System.setOut(console);
			

		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} 

		if (operationHash != "") {
			
			Batch batch = new Batch(batchId, operationHash, Batch.WITHOUT_CREDENTIALS, settings);
			Credential credential = new Credential(holderContact.getName(), settings);
			credential.setHash(signedCredentialHash);
			credential.setJSON(credentialJson);
			credential.setPartOfBatch(batch);
			
			if(batch.saveInVault()) {
				System.out.println("Batch saved in vault");
				if(credential.saveInVault()) {
					System.out.println("Credential saved saved in vault");
				}
				else {
					System.err.println("Credential was not saved in vault");
				}
			}
			else {
				System.err.println("Batch was not saved in vault");
			}
				
			
		}
	}

}
