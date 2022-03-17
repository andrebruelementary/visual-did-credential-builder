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

	// private DIDKeyInfo[] keysToAdd;
	// private String[] keysToRevoke;

	public IssueCredentialJob(DID d) {
		issuerDID = d;
	}

	public void run() {
		String operationHash = "";
		try {

			KeyGenerator keygen = KeyGenerator.INSTANCE;
			// KeyDerivation keyder = KeyDerivation.INSTANCE;

			ECKeyPair issuerMasterKeyPair = keygen.deriveKeyFromFullPath(issuerDID.getSeed(), 0,
					PrismKeyType.INSTANCE.getMASTER_KEY(), 0);
			ECKeyPair issuerIssuingKeyPair = keygen.deriveKeyFromFullPath(issuerDID.getSeed(), 0,
					PrismKeyType.INSTANCE.getISSUING_KEY(), 1);

			// ExtendedKey exKey = keyder.derivationRoot(issuingDID.getSeed());
			// exKey.

			// issuingDID.g

			// ECPublicKey issuerIssuingKey = null;
			/*List<String> issuingKeyNames = new Vector<String>();
			PrismKeyInformation[] holderKeys = issuingDID.getDataModel().getPublicKeys();
			for (int i = 0; i < holderKeys.length; i++) {
				if (holderKeys[i].getKeyTypeEnum() == PrismKeyType.INSTANCE.getISSUING_KEY()) {
					//
				}
			}*/

			// if(issuerIssuingKey == null) {
			// //TODO: Display warning; there is no issuing key present in issuing DID
			// return;
			// }

			// issuingDID.getDataModel().

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
			
			// JsonElementBuildersKt.

			/*
			 * JsonObject(mapOf( Pair("name", JsonPrimitive("Lars Brünjes")), Pair("degree",
			 * JsonPrimitive("Doctor of Mathematics")), Pair("year", JsonPrimitive(2001)))))
			 */
			/*
			 * JsonObject(mapOf( //Pair("name", JsonPrimitive(name)), Pair("degree",
			 * JsonPrimitive("Atala Prism Pioneer")), Pair("year", JsonPrimitive(2021))))
			 */

			/*
			 * JSONObject obj = new JSONObject(); obj.put("name", "Alice"); obj.put("year",
			 * 2003); obj.put("degree", "Doctor of Medicine");
			 */
			
			// Creating a File object that represents the disk file. 
			PrintStream o = new PrintStream(new FileOutputStream(issuerDID.getLogFilePath(), true), true);
						
			// Store current System.out before assigning a new value 
			PrintStream console = System.out;
			// Assign o to output stream 
			System.setOut(o);

			JSONObject obj = new JSONObject();
			obj.put("year", 2021);
			obj.put("degree", "Atala Prism Pioneer");

			/*
			 * JSONArray list = new JSONArray(); list.add("msg 1"); list.add("msg 2");
			 * list.add("msg 3");
			 * 
			 * obj.put("messages", list);
			 */

			System.out.println("Json as JSONString" + obj.toJSONString());

			System.out.println("------- keys --------");
			Iterator i = obj.keySet().iterator();
			while (i.hasNext()) {
				System.out.println("- " + i.next());
			}
			System.out.println("---------------------");
			
			JsonObject credentialJson = publishDid.JsonHelper.Companion.getJsonObject(obj.toJSONString());
			
			List<CredentialClaim> claims = new Vector<CredentialClaim>();
			
			//LongFormPrismDid holderDIDLongForm = PrismDid.buildLongFormFromMasterPublicKey(issuerMasterKeyPair.getPublicKey());
			String charlieLongFormDid = "did:prism:62441b3634f80655b13b0b7b670e307f0429f8e7ece8f8cdf318b6530a5abb98:Cj8KPRI7CgdtYXN0ZXIwEAFKLgoJc2VjcDI1NmsxEiEDQdICjEcope89n_H_tOFqZ7HKLSUXaBxBolEqROuNZMs";
			
			PrismDid charlieDid = PrismDid.fromString(charlieLongFormDid);
			//holderDid.getValue()
			
			CredentialClaim claim = new CredentialClaim(charlieDid, credentialJson);
			claims.add(claim);
			
			
			IssueCredentialsInfo credInfo = nodePayloadGenerator.issueCredentials("issuing1", claims.toArray(CredentialClaim[]::new));
			
			
			
			operationHash = PrismCredentialAction.Companion.publishCredential(issuingDIDLongForm.asCanonical(), credInfo, "issuing1");
			System.out.println("ISSUE CREDENTIAL OPERATION HASH RETURNED = " + operationHash);
			
			System.setOut(console);
			

			
			// action.issueCredential(obj.toJSONString());

			// HashMap<String, JsonElement> jsonMap = new HashMap<String, JsonElement>();

			// JsonObject jsonObj = Json.decodeFromString(<StringFormat>, "");
			// JsonObject jsonObj = Json.Default.decodeFromString(new
			// kotlinx.serialization.<StringFormat>(), "");
			// json.
			// JsonBuilder builder = new JsonBuilder(null);

			// JSONObject jsonObj = new JSONObject();
			// jsonObj.put("name", jsonObj)

			// jsonMap.put("name", JsonPrimitive("Alice"));

			// JsonObject credentialJson = new JsonObject(jsonMap);
			// KSerializer<JsonObject> obj = JsonObject.Companion.serializer();
			// obj.deserialize(Decoder.DefaultImpls.)

			// JsonElement deserializedToTree = json.parseToJsonElement("{\"name\" :
			// \"Alice\"}");

			// CredentialClaim credentialClaim = new CredentialClaim(unpublishedDid,
			// deserializedToTree.Companion.);

			// Json json = Json.Default;
			// String stringOutput = json.encodeToString();

			/*
			 * Sha256Digest oldHash = Sha256Digest.fromHex(did.getLatestOperationHash());
			 * 
			 * List<PrismKeyInformation> keysToAddList = new Vector<PrismKeyInformation>();
			 * 
			 * String keyNameToAdd = keysToAdd[0].getKeyName(); if
			 * (keyNameToAdd.trim().equals("")) { // no key name provided...set key name as
			 * default according to type and index int typeToAdd =
			 * keysToAdd[0].getKeyType(); if (typeToAdd ==
			 * PrismKeyType.INSTANCE.getISSUING_KEY()) { keyNameToAdd =
			 * PrismDid.getDEFAULT_ISSUING_KEY_ID(); } else if (typeToAdd ==
			 * PrismKeyType.INSTANCE.getMASTER_KEY()) { keyNameToAdd =
			 * PrismDid.getDEFAULT_MASTER_KEY_ID(); } else if (typeToAdd ==
			 * PrismKeyType.INSTANCE.getREVOCATION_KEY()) { keyNameToAdd =
			 * PrismDid.getDEFAULT_REVOCATION_KEY_ID(); }
			 * 
			 * keyNameToAdd.replace("0", "" + keysToAdd[0].getKeyIndex()); }
			 * 
			 * keysToAddList.add(new PrismKeyInformation(keyNameToAdd,
			 * keysToAdd[0].getKeyType(), keyPairToAdd.getPublicKey(), null, null));
			 * 
			 * List<String> keysToRevokeList = new Vector<String>();
			 * 
			 * UpdateDidInfo updateDidInfo = nodePayloadGenerator.updateDid(oldHash,
			 * PrismDid.getDEFAULT_MASTER_KEY_ID(),
			 * keysToAddList.toArray(PrismKeyInformation[]::new),
			 * keysToRevokeList.toArray(String[]::new));
			 * 
			 * // Creating a File object that represents the disk file. PrintStream o = new
			 * PrintStream(new FileOutputStream(did.getLogFilePath(), true), true);
			 * 
			 * // Store current System.out before assigning a new value PrintStream console
			 * = System.out;
			 * 
			 * // Assign o to output stream System.setOut(o);
			 * 
			 * operationHash = PrismNodeUpdateAction.Companion.addKeys(updateDidInfo,
			 * unpublishedDid, oldHash, keysToAddList.toArray(PrismKeyInformation[]::new));
			 * 
			 * System.out.println("ADD OPERATION HASH RETURNED = " + operationHash);
			 * 
			 * System.setOut(console);
			 */

		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}
		if (operationHash != "") {
			System.out.println("Saving operation hash to xml");
			issuerDID.setLatestOperationHash(operationHash);
			System.out.println("Operation hash after xml update " + issuerDID.getLatestOperationHash());
		}
	}

}
